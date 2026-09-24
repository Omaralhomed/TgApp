import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TelegramEngineService } from '../../telegram/telegram-engine.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { QueueService } from '../queue.service';
import { parseSpintax } from '../../campaigns/spintax.util';

@Injectable()
export class CampaignProcessor {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
  ) {}

  /**
   * Runs a campaign with full progress, cancellation, account rotation, and event auditing
   */
  async processCampaign(campaignId: string, runId?: string, userId?: string) {
    const signal = this.queueService.registerExecution(campaignId, 'CAMPAIGN');

    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { group: true },
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Update Campaign status to RUNNING
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING' },
      });

      // Create or update CampaignRun
      let activeRun = runId
        ? await this.prisma.campaignRun.findUnique({ where: { id: runId } })
        : null;

      if (!activeRun) {
        activeRun = await this.prisma.campaignRun.create({
          data: {
            campaignId: campaign.id,
            status: 'RUNNING',
            triggeredBy: userId || 'SYSTEM',
          },
        });
      }

      this.wsGateway.emitCampaignProgress(campaign.id, {
        campaignId: campaign.id,
        status: 'RUNNING',
        total: campaign.totalTargets,
        sent: campaign.sentCount,
        failed: campaign.failedCount,
        progress: campaign.totalTargets > 0 ? Math.round((campaign.sentCount / campaign.totalTargets) * 100) : 0,
      }, campaign.userId);

      // 1. Fetch Target Audience
      let targets: Array<{
        userId: string;
        accessHash?: string | null;
        username?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      }> = [];

      if (campaign.groupId) {
        const members = await this.prisma.scrapedMember.findMany({
          where: { groupId: campaign.groupId, isBot: false },
        });
        targets = members.map((m) => ({
          userId: m.userId,
          accessHash: m.accessHash,
          username: m.username,
          firstName: m.firstName,
          lastName: m.lastName,
        }));
      } else {
        const members = await this.prisma.scrapedMember.findMany({
          where: { group: { userId: campaign.userId }, isBot: false },
        });
        targets = members.map((m) => ({
          userId: m.userId,
          accessHash: m.accessHash,
          username: m.username,
          firstName: m.firstName,
          lastName: m.lastName,
        }));
      }

      // Checkpoint Architecture: Ensure CampaignTarget table holds all targets with their execution status
      const existingTargetsCount = await this.prisma.campaignTarget.count({
        where: { campaignId: campaign.id },
      });

      if (existingTargetsCount === 0 && targets.length > 0) {
        await this.prisma.campaignTarget.createMany({
          data: targets.map((t) => ({
            campaignId: campaign.id,
            targetUserId: t.userId,
            username: t.username || null,
            firstName: t.firstName || null,
            status: 'PENDING',
          })),
        });
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { totalTargets: targets.length },
        });
      }

      // Fetch remaining PENDING targets from checkpoint (ensures resume without duplicates)
      const remainingTargets = await this.prisma.campaignTarget.findMany({
        where: { campaignId: campaign.id, status: 'PENDING' },
        include: { scrapedMember: true },
      });

      this.logger.log(`Starting execution for Campaign "${campaign.name}" with ${remainingTargets.length} remaining checkpoint targets.`);
      this.wsGateway.emitLog('INFO', `Starting Campaign "${campaign.name}" (${remainingTargets.length} targets remaining in checkpoint)`);

      // 2. Fetch Available Telegram Accounts
      const accounts = await this.prisma.telegramAccount.findMany({
        where: {
          userId: campaign.userId,
          status: 'ACTIVE',
          sessionString: { not: null },
        },
        include: { proxy: true },
      });

      if (accounts.length === 0) {
        throw new Error('No active Telegram accounts available for this user.');
      }

      let targetIdx = 0;
      let accountIdx = 0;
      let sentCount = campaign.sentCount;
      let failedCount = campaign.failedCount;

      while (targetIdx < remainingTargets.length) {
        if (signal.aborted) {
          this.logger.log(`Campaign ${campaign.id} aborted/paused by user.`);
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'PAUSED', sentCount, failedCount },
          });
          if (activeRun) {
            await this.prisma.campaignRun.update({
              where: { id: activeRun.id },
              data: { status: 'PAUSED', successCount: sentCount, failedCount },
            });
          }
          return;
        }

        const target = remainingTargets[targetIdx];
        const targetUserId = target.targetUserId;
        const targetUsername = target.username;
        const targetFirstName = target.firstName;
        const targetLastName = target.scrapedMember?.lastName || '';
        const targetAccessHash = target.scrapedMember?.accessHash || undefined;

        const account = accounts[accountIdx % accounts.length];
        accountIdx++;

        // Evaluate account limit
        const health = this.tgEngine.policyEngine.evaluateAccountHealth(account);
        if (health.isCooldown || health.remainingToday <= 0) {
          this.logger.warn(`Account ${account.phone} reached limit or cooldown. Skipping to next.`);
          // If all accounts are exhausted, pause campaign
          const anyReady = accounts.some((a) => {
            const h = this.tgEngine.policyEngine.evaluateAccountHealth(a);
            return !h.isCooldown && h.remainingToday > 0;
          });
          if (!anyReady) {
            this.logger.warn('All available accounts reached daily limits or cooldown. Pausing campaign.');
            this.wsGateway.emitLog('WARN', 'All accounts reached daily limit or cooldown. Pausing campaign.');
            await this.prisma.campaign.update({
              where: { id: campaign.id },
              data: { status: 'PAUSED', sentCount, failedCount },
            });
            return;
          }
          continue;
        }

        // Format message with spintax & variables
        let personalizedMsg = parseSpintax(campaign.messageTemplate);
        personalizedMsg = personalizedMsg
          .replace(/{firstName}/g, targetFirstName || '')
          .replace(/{lastName}/g, targetLastName || '')
          .replace(/{username}/g, targetUsername ? `@${targetUsername}` : '')
          .trim();

        // Task 7.3: Zero-Width Hash Obfuscator (Inject invisible Unicode to defeat Telegram spam hash matching)
        personalizedMsg = this.tgEngine.policyEngine.obfuscateTextHash(personalizedMsg);

        try {
          const client = await this.tgEngine.getClient(
            account.phone,
            account.apiId,
            account.apiHash,
            account.sessionString!,
            account.proxy,
          );

          const targetPeer = {
            userId: targetUserId,
            username: targetUsername || undefined,
            accessHash: targetAccessHash,
          };

          let mediaUrl: string | undefined;
          try {
            if (campaign.policyConfig) {
              const parsed = JSON.parse(campaign.policyConfig);
              if (parsed.mediaUrl) mediaUrl = parsed.mediaUrl;
            }
          } catch {}

          const sendResult = await this.tgEngine.sendDirectMessage(client, targetPeer, personalizedMsg, mediaUrl);

          if (sendResult.success) {
            sentCount++;
            await this.prisma.telegramAccount.update({
              where: { id: account.id },
              data: {
                sentToday: { increment: 1 },
                totalSent: { increment: 1 },
                lastSentAt: new Date(),
              },
            });

            await this.prisma.campaignLog.create({
              data: {
                campaignId: campaign.id,
                accountId: account.id,
                targetUserId: targetUserId,
                status: 'SUCCESS',
              },
            });

            await this.prisma.campaignEvent.create({
              data: {
                campaignId: campaign.id,
                campaignRunId: activeRun?.id,
                accountId: account.id,
                targetUserId: targetUserId,
                targetUsername: targetUsername,
                eventType: 'MESSAGE_SENT',
                status: 'SUCCESS',
              },
            });

            await this.prisma.campaignTarget.update({
              where: { id: target.id },
              data: { status: 'SENT', lastAttemptAt: new Date() },
            });

            // Increment tenant message quota in database
            await this.prisma.user.update({
              where: { id: campaign.userId },
              data: { quotaMessagesUsed: { increment: 1 } },
            });

            this.wsGateway.emitLog('SUCCESS', `[${account.phone}] Sent message to ${targetUsername ? '@' + targetUsername : targetUserId}`);

            // Enforce quota limit mid-campaign
            const updatedUser = await this.prisma.user.findUnique({
              where: { id: campaign.userId },
              select: { quotaMessagesUsed: true, quotaMessagesLimit: true },
            });
            if (updatedUser && updatedUser.quotaMessagesUsed >= updatedUser.quotaMessagesLimit) {
              this.logger.warn(`Campaign ${campaign.id}: User quota limit reached (${updatedUser.quotaMessagesUsed}/${updatedUser.quotaMessagesLimit}). Pausing execution.`);
              await this.prisma.campaign.update({
                where: { id: campaign.id },
                data: { status: 'PAUSED', sentCount, failedCount },
              });
              this.wsGateway.emitLog('WARN', 'Campaign paused: Monthly message quota limit reached.');
              return;
            }
          } else {
            failedCount++;

            await this.prisma.campaignTarget.update({
              where: { id: target.id },
              data: { status: 'FAILED', lastAttemptAt: new Date(), error: sendResult.error || 'Failed to send' },
            });

            if (sendResult.isFloodWait && sendResult.floodWaitSeconds) {
              const cooldownUntil = new Date(Date.now() + sendResult.floodWaitSeconds * 1000);
              await this.prisma.telegramAccount.update({
                where: { id: account.id },
                data: {
                  status: 'FLOOD_WAIT',
                  floodWaitUntil: cooldownUntil,
                  totalFailed: { increment: 1 },
                },
              });
              this.wsGateway.emitLog('WARN', `[${account.phone}] Flood wait triggered (${sendResult.floodWaitSeconds}s). Account put in cooldown.`);
            } else {
              await this.prisma.telegramAccount.update({
                where: { id: account.id },
                data: { totalFailed: { increment: 1 } },
              });
            }

            await this.prisma.campaignLog.create({
              data: {
                campaignId: campaign.id,
                accountId: account.id,
                targetUserId: targetUserId,
                status: 'FAILED',
                error: sendResult.error || 'Failed to send message',
              },
            });

            await this.prisma.campaignEvent.create({
              data: {
                campaignId: campaign.id,
                campaignRunId: activeRun?.id,
                accountId: account.id,
                targetUserId: targetUserId,
                targetUsername: targetUsername,
                eventType: sendResult.isFloodWait ? 'FLOOD_WAIT' : 'SYSTEM_ERROR',
                status: 'FAILED',
                error: sendResult.error,
              },
            });

            this.wsGateway.emitLog('ERROR', `[${account.phone}] Failed to message ${targetUserId}: ${sendResult.error}`);
          }
        } catch (err: any) {
          failedCount++;
          await this.prisma.campaignTarget.update({
            where: { id: target.id },
            data: { status: 'FAILED', lastAttemptAt: new Date(), error: err.message },
          });
          this.logger.error(`Error sending message via ${account.phone}: ${err.message}`);
          this.wsGateway.emitLog('ERROR', `[${account.phone}] Send error: ${err.message}`);
        }

        // Progress Calculation
        const total = campaign.totalTargets || remainingTargets.length;
        const currentProgress = total > 0 ? Math.min(100, Math.round(((sentCount + failedCount) / total) * 100)) : 0;

        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { sentCount, failedCount },
        });

        if (activeRun) {
          await this.prisma.campaignRun.update({
            where: { id: activeRun.id },
            data: {
              processedCount: sentCount + failedCount,
              successCount: sentCount,
              failedCount,
              progress: currentProgress,
            },
          });
        }

        this.wsGateway.emitCampaignProgress(campaign.id, {
          campaignId: campaign.id,
          status: 'RUNNING',
          total,
          sent: sentCount,
          failed: failedCount,
          progress: currentProgress,
        }, campaign.userId);

        targetIdx++;

        // Delay between operations with safety jitter
        if (targetIdx < remainingTargets.length && !signal.aborted) {
          const delaySec = this.tgEngine.policyEngine.calculateDelay(
            campaign.delayMinSeconds,
            campaign.delayMaxSeconds,
            account.warmupDays,
          );
          this.logger.log(`Waiting ${delaySec}s before next dispatch...`);
          await new Promise((res) => setTimeout(res, delaySec * 1000));
        }
      }

      // Mark Campaign Completed
      await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED', sentCount, failedCount },
      });

      if (activeRun) {
        await this.prisma.campaignRun.update({
          where: { id: activeRun.id },
          data: {
            status: 'COMPLETED',
            successCount: sentCount,
            failedCount,
            progress: 100,
            endedAt: new Date(),
          },
        });
      }

      this.wsGateway.emitCampaignProgress(campaign.id, {
        campaignId: campaign.id,
        status: 'COMPLETED',
        total: campaign.totalTargets,
        sent: sentCount,
        failed: failedCount,
        progress: 100,
      }, campaign.userId);

      this.wsGateway.emitUserLog(campaign.userId, 'SUCCESS', `Campaign "${campaign.name}" completed successfully! (${sentCount} sent, ${failedCount} failed)`);
    } catch (err: any) {
      this.logger.error(`Campaign execution error: ${err.message}`);
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'FAILED' },
      });
      this.wsGateway.emitLog('ERROR', `Campaign failed: ${err.message}`);
    } finally {
      this.queueService.finishExecution(campaignId);
    }
  }
}

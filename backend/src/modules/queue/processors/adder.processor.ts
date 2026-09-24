import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TelegramEngineService } from '../../telegram/telegram-engine.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { QueueService } from '../queue.service';

@Injectable()
export class AdderProcessor {
  private readonly logger = new Logger(AdderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
  ) {}

  /**
   * Processes a member adding task with account rotation, privacy detection, and delay jitter
   */
  async processTask(taskId: string, userId?: string) {
    const signal = this.queueService.registerExecution(taskId, 'ADD_MEMBERS');

    try {
      const task = await this.prisma.addMembersTask.findUnique({
        where: { id: taskId },
        include: { sourceGroup: true },
      });

      if (!task) {
        throw new Error(`AddMembersTask ${taskId} not found`);
      }

      await this.prisma.addMembersTask.update({
        where: { id: taskId },
        data: { status: 'RUNNING' },
      });

      this.wsGateway.emitTaskProgress(task.id, {
        taskId: task.id,
        status: 'RUNNING',
        total: task.totalTargets,
        added: task.addedCount,
        failed: task.failedCount,
        progress: task.totalTargets > 0 ? Math.round((task.addedCount / task.totalTargets) * 100) : 0,
      });

      // 1. Fetch Candidates from source group
      let candidates: Array<{
        userId: string;
        username?: string | null;
        accessHash?: string | null;
      }> = [];

      if (task.sourceGroupId) {
        const members = await this.prisma.scrapedMember.findMany({
          where: { groupId: task.sourceGroupId, isBot: false },
        });
        candidates = members.map((m) => ({
          userId: m.userId,
          username: m.username,
          accessHash: m.accessHash,
        }));
      } else {
        const members = await this.prisma.scrapedMember.findMany({
          where: { group: { userId: task.userId }, isBot: false },
        });
        candidates = members.map((m) => ({
          userId: m.userId,
          username: m.username,
          accessHash: m.accessHash,
        }));
      }

      // Filter out already processed members for this task
      const existingLogs = await this.prisma.addMembersLog.findMany({
        where: { taskId: task.id },
        select: { targetUserId: true },
      });
      const processedSet = new Set(existingLogs.map((l) => l.targetUserId));
      const remainingCandidates = candidates.filter((c) => !processedSet.has(c.userId));

      this.logger.log(`Starting AddMembersTask "${task.name}" with ${remainingCandidates.length} remaining candidates.`);
      this.wsGateway.emitLog('INFO', `Starting AddMembersTask "${task.name}" (${remainingCandidates.length} remaining)`);

      // 2. Fetch Active Telegram Accounts
      const accounts = await this.prisma.telegramAccount.findMany({
        where: {
          userId: task.userId,
          status: 'ACTIVE',
          sessionString: { not: null },
        },
        include: { proxy: true },
      });

      if (accounts.length === 0) {
        throw new Error('No active Telegram accounts found for this user.');
      }

      let candidateIdx = 0;
      let accountIdx = 0;
      let addedCount = task.addedCount;
      let failedCount = task.failedCount;
      let privacyRestrictedCount = task.privacyRestrictedCount;
      let alreadyMemberCount = task.alreadyMemberCount;

      while (candidateIdx < remainingCandidates.length) {
        if (signal.aborted) {
          this.logger.log(`Task ${task.id} paused/aborted by user.`);
          await this.prisma.addMembersTask.update({
            where: { id: task.id },
            data: { status: 'PAUSED', addedCount, failedCount, privacyRestrictedCount, alreadyMemberCount },
          });
          return;
        }

        const candidate = remainingCandidates[candidateIdx];
        const account = accounts[accountIdx % accounts.length];
        accountIdx++;

        // Account limits & health check
        const health = this.tgEngine.policyEngine.evaluateAccountHealth(account);
        if (health.isCooldown || health.remainingToday <= 0) {
          this.logger.warn(`Account ${account.phone} reached limit or cooldown. Rotating.`);
          const anyReady = accounts.some((a) => {
            const h = this.tgEngine.policyEngine.evaluateAccountHealth(a);
            return !h.isCooldown && h.remainingToday > 0;
          });
          if (!anyReady) {
            this.logger.warn('All accounts reached limits/cooldown. Pausing task.');
            this.wsGateway.emitLog('WARN', 'All accounts reached daily limit or cooldown. Pausing adder task.');
            await this.prisma.addMembersTask.update({
              where: { id: task.id },
              data: { status: 'PAUSED', addedCount, failedCount, privacyRestrictedCount, alreadyMemberCount },
            });
            return;
          }
          continue;
        }

        try {
          const client = await this.tgEngine.getClient(
            account.phone,
            account.apiId,
            account.apiHash,
            account.sessionString!,
            account.proxy,
          );

          const inviteRes = await this.tgEngine.inviteMemberToGroup(client, task.targetGroup, candidate);

          if (inviteRes.success) {
            addedCount++;
            await this.prisma.telegramAccount.update({
              where: { id: account.id },
              data: {
                sentToday: { increment: 1 },
                totalSent: { increment: 1 },
                lastSentAt: new Date(),
              },
            });

            await this.prisma.addMembersLog.create({
              data: {
                taskId: task.id,
                accountId: account.id,
                targetUserId: candidate.userId,
                targetUsername: candidate.username,
                status: 'SUCCESS',
              },
            });

            this.wsGateway.emitLog('SUCCESS', `[${account.phone}] Added member ${candidate.username ? '@' + candidate.username : candidate.userId} to ${task.targetGroup}`);
          } else if (inviteRes.isAlreadyParticipant) {
            alreadyMemberCount++;
            await this.prisma.addMembersLog.create({
              data: {
                taskId: task.id,
                accountId: account.id,
                targetUserId: candidate.userId,
                targetUsername: candidate.username,
                status: 'ALREADY_PARTICIPANT',
                error: inviteRes.error,
              },
            });
            this.wsGateway.emitLog('INFO', `User ${candidate.userId} is already a member.`);
          } else if (inviteRes.isPrivacyRestricted) {
            privacyRestrictedCount++;
            failedCount++;
            await this.prisma.addMembersLog.create({
              data: {
                taskId: task.id,
                accountId: account.id,
                targetUserId: candidate.userId,
                targetUsername: candidate.username,
                status: 'PRIVACY_RESTRICTED',
                error: inviteRes.error,
              },
            });
            this.wsGateway.emitLog('WARN', `User ${candidate.userId} has privacy restrictions enabled.`);
          } else {
            failedCount++;

            if (inviteRes.isFloodWait && inviteRes.floodWaitSeconds) {
              const cooldownUntil = new Date(Date.now() + inviteRes.floodWaitSeconds * 1000);
              await this.prisma.telegramAccount.update({
                where: { id: account.id },
                data: {
                  status: 'FLOOD_WAIT',
                  floodWaitUntil: cooldownUntil,
                  totalFailed: { increment: 1 },
                },
              });
              this.wsGateway.emitLog('WARN', `[${account.phone}] Flood wait triggered (${inviteRes.floodWaitSeconds}s).`);
            } else {
              await this.prisma.telegramAccount.update({
                where: { id: account.id },
                data: { totalFailed: { increment: 1 } },
              });
            }

            await this.prisma.addMembersLog.create({
              data: {
                taskId: task.id,
                accountId: account.id,
                targetUserId: candidate.userId,
                targetUsername: candidate.username,
                status: 'FAILED',
                error: inviteRes.error,
              },
            });

            this.wsGateway.emitLog('ERROR', `[${account.phone}] Failed to add ${candidate.userId}: ${inviteRes.error}`);
          }
        } catch (err: any) {
          failedCount++;
          this.logger.error(`Error adding member via ${account.phone}: ${err.message}`);
          this.wsGateway.emitLog('ERROR', `[${account.phone}] Add error: ${err.message}`);
        }

        // Update progress
        const total = task.totalTargets || remainingCandidates.length;
        const progress = total > 0 ? Math.min(100, Math.round(((addedCount + failedCount) / total) * 100)) : 0;

        await this.prisma.addMembersTask.update({
          where: { id: task.id },
          data: { addedCount, failedCount, privacyRestrictedCount, alreadyMemberCount },
        });

        this.wsGateway.emitTaskProgress(task.id, {
          taskId: task.id,
          status: 'RUNNING',
          total,
          added: addedCount,
          failed: failedCount,
          progress,
        });

        candidateIdx++;

        if (candidateIdx < remainingCandidates.length && !signal.aborted) {
          const delaySec = this.tgEngine.policyEngine.calculateDelay(
            task.delayMinSeconds,
            task.delayMaxSeconds,
            account.warmupDays,
          );
          await new Promise((res) => setTimeout(res, delaySec * 1000));
        }
      }

      await this.prisma.addMembersTask.update({
        where: { id: task.id },
        data: { status: 'COMPLETED', addedCount, failedCount, privacyRestrictedCount, alreadyMemberCount },
      });

      this.wsGateway.emitTaskProgress(task.id, {
        taskId: task.id,
        status: 'COMPLETED',
        total: task.totalTargets,
        added: addedCount,
        failed: failedCount,
        progress: 100,
      });

      this.wsGateway.emitLog('SUCCESS', `Task "${task.name}" completed! (${addedCount} added, ${privacyRestrictedCount} privacy restricted, ${failedCount} failed)`);
    } catch (err: any) {
      this.logger.error(`AddMembersTask error: ${err.message}`);
      await this.prisma.addMembersTask.update({
        where: { id: taskId },
        data: { status: 'FAILED' },
      });
      this.wsGateway.emitLog('ERROR', `Adder task failed: ${err.message}`);
    } finally {
      this.queueService.finishExecution(taskId);
    }
  }
}

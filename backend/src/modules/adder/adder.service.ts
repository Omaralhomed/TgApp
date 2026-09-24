import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramEngineService } from '../telegram/telegram-engine.service';
import { EventsGateway } from '../websocket/events.gateway';
import { AdderProcessor } from '../queue/processors/adder.processor';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class AdderService implements OnModuleInit {
  private readonly logger = new Logger(AdderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    private readonly adderProcessor: AdderProcessor,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    try {
      const orphaned = await this.prisma.addMembersTask.findMany({
        where: { status: 'RUNNING' },
      });
      if (orphaned.length > 0) {
        this.logger.warn(`Recovered ${orphaned.length} orphaned RUNNING adder tasks. Setting to PAUSED.`);
        await this.prisma.addMembersTask.updateMany({
          where: { status: 'RUNNING' },
          data: { status: 'PAUSED' },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Adder task recovery error: ${err.message}`);
    }
  }

  async listTasks(userId?: string) {
    return this.prisma.addMembersTask.findMany({
      where: userId ? { userId } : {},
      include: {
        sourceGroup: {
          select: { title: true, memberCount: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskDetails(id: string, userId?: string) {
    const task = await this.prisma.addMembersTask.findFirst({
      where: userId ? { id, userId } : { id },
      include: {
        sourceGroup: true,
        logs: {
          take: 100,
          orderBy: { addedAt: 'desc' },
          include: {
            account: {
              select: { phone: true, username: true },
            },
          },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    const isRunning = this.queueService.isExecuting(task.id);
    return {
      ...task,
      isRunning,
    };
  }

  async createTask(dto: {
    name: string;
    sourceGroupId?: string;
    targetGroup: string;
    delayMinSeconds?: number;
    delayMaxSeconds?: number;
    userId: string;
  }) {
    let targetCount = 0;

    if (dto.sourceGroupId) {
      const group = await this.prisma.groupTarget.findFirst({
        where: { id: dto.sourceGroupId, userId: dto.userId },
      });
      if (!group) throw new BadRequestException('Source group not found or invalid');
      targetCount = await this.prisma.scrapedMember.count({
        where: { groupId: dto.sourceGroupId, isBot: false },
      });
    } else {
      targetCount = await this.prisma.scrapedMember.count({
        where: { group: { userId: dto.userId }, isBot: false },
      });
    }

    if (targetCount === 0) {
      throw new BadRequestException('No scraped candidates found. Scrape a source group first.');
    }

    const task = await this.prisma.addMembersTask.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        sourceGroupId: dto.sourceGroupId || null,
        targetGroup: dto.targetGroup.trim(),
        delayMinSeconds: dto.delayMinSeconds ? Math.max(10, Number(dto.delayMinSeconds)) : 20,
        delayMaxSeconds: dto.delayMaxSeconds ? Math.max(20, Number(dto.delayMaxSeconds)) : 50,
        status: 'DRAFT',
        totalTargets: targetCount,
      },
      include: { sourceGroup: true },
    });

    this.wsGateway.emitLog('INFO', `Created member adder task "${task.name}" with ${targetCount} candidate members.`);
    return task;
  }

  async startTask(id: string, userId: string) {
    const task = await this.prisma.addMembersTask.findFirst({
      where: { id, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    if (this.queueService.isExecuting(task.id)) {
      throw new BadRequestException('Task is already running.');
    }

    const activeAccountsCount = await this.prisma.telegramAccount.count({
      where: { userId, status: 'ACTIVE', sessionString: { not: null } },
    });
    if (activeAccountsCount === 0) {
      throw new BadRequestException('Cannot start task: You need at least one ACTIVE Telegram account.');
    }

    // Dispatch adder task execution to BullMQ / Queue engine
    await this.queueService.addAdderJob({ taskId: task.id, userId });

    return { success: true, message: 'Member adder task enqueued in background.' };
  }

  async pauseTask(id: string, userId: string) {
    const task = await this.prisma.addMembersTask.findFirst({
      where: { id, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    this.queueService.cancelExecution(task.id);

    await this.prisma.addMembersTask.update({
      where: { id: task.id },
      data: { status: 'PAUSED' },
    });

    this.wsGateway.emitTaskProgress(task.id, {
      taskId: task.id,
      status: 'PAUSED',
      total: task.totalTargets,
      added: task.addedCount,
      failed: task.failedCount,
      progress: task.totalTargets > 0 ? Math.round((task.addedCount / task.totalTargets) * 100) : 0,
    });

    return { success: true, message: 'Task paused successfully.' };
  }

  async deleteTask(id: string, userId: string) {
    const task = await this.prisma.addMembersTask.findFirst({
      where: { id, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    this.queueService.cancelExecution(task.id);

    await this.prisma.addMembersTask.delete({ where: { id: task.id } });
    return { success: true, message: 'Task deleted successfully.' };
  }
}

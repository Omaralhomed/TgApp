import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { EventsGateway } from '../websocket/events.gateway';
import { PrismaService } from '../../database/prisma.service';
import { CampaignProcessor } from './processors/campaign.processor';
import { AdderProcessor } from './processors/adder.processor';
import { ScraperProcessor } from './processors/scraper.processor';

export interface CampaignJobPayload {
  campaignId: string;
  runId?: string;
  userId?: string;
}

export interface AdderJobPayload {
  taskId: string;
  userId?: string;
}

export interface ScraperJobPayload {
  groupId?: string;
  groupUsernameOrLink: string;
  phone: string;
  userId?: string;
  limit?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private redisClient: IORedis | null = null;
  public isRedisConnected = false;

  private campaignQueue: Queue | null = null;
  private adderQueue: Queue | null = null;
  private scraperQueue: Queue | null = null;
  private healthQueue: Queue | null = null;

  private campaignWorker: Worker | null = null;
  private adderWorker: Worker | null = null;
  private scraperWorker: Worker | null = null;

  // Active in-memory execution tracker for cancellation / status
  private activeExecutions = new Map<string, { abortController: AbortController; type: string }>();

  constructor(
    private readonly wsGateway: EventsGateway,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => CampaignProcessor))
    private readonly campaignProcessor: CampaignProcessor,
    @Inject(forwardRef(() => AdderProcessor))
    private readonly adderProcessor: AdderProcessor,
    @Inject(forwardRef(() => ScraperProcessor))
    private readonly scraperProcessor: ScraperProcessor,
  ) {}

  async onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;
    const password = process.env.REDIS_PASSWORD || undefined;

    // 1. Checkpoint Recovery: check for any tasks left stranded in 'RUNNING' status from previous server crash/restart
    await this.recoverStrandedJobs();

    try {
      this.redisClient = new IORedis({
        host,
        port,
        password,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`Redis not available at ${host}:${port}. Using resilient in-memory job engine fallback.`);
            return null; // Stop retrying to avoid spamming
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.log(`BullMQ Connected to Redis at ${host}:${port}`);
        this.initQueues();
      });

      this.redisClient.on('error', () => {
        this.isRedisConnected = false;
      });
    } catch (err: any) {
      this.logger.warn(`Redis init error: ${err.message}. Operating in resilient in-memory mode.`);
    }
  }

  private initQueues() {
    if (!this.redisClient) return;
    try {
      const connection = this.redisClient;
      this.campaignQueue = new Queue('campaigns', { connection });
      this.adderQueue = new Queue('adder', { connection });
      this.scraperQueue = new Queue('scraper', { connection });
      this.healthQueue = new Queue('health', { connection });

      // Initialize BullMQ Workers for asynchronous distributed job execution
      this.campaignWorker = new Worker(
        'campaigns',
        async (job: Job<CampaignJobPayload>) => {
          this.logger.log(`BullMQ Worker executing campaign job ${job.id}`);
          await this.campaignProcessor.processCampaign(job.data.campaignId, job.data.runId, job.data.userId);
        },
        { connection, concurrency: 3 },
      );

      this.adderWorker = new Worker(
        'adder',
        async (job: Job<AdderJobPayload>) => {
          this.logger.log(`BullMQ Worker executing adder job ${job.id}`);
          await this.adderProcessor.processTask(job.data.taskId, job.data.userId);
        },
        { connection, concurrency: 2 },
      );

      this.scraperWorker = new Worker(
        'scraper',
        async (job: Job<ScraperJobPayload>) => {
          this.logger.log(`BullMQ Worker executing scraper job ${job.id}`);
          await this.scraperProcessor.processScraping(job.data);
        },
        { connection, concurrency: 2 },
      );

      this.logger.log('BullMQ Queues and Workers initialized successfully.');
    } catch (err: any) {
      this.logger.warn(`Could not initialize BullMQ queues/workers: ${err.message}`);
    }
  }

  /**
   * Checkpoint Auto-Recovery: Safely handles jobs that were interrupted by a reboot
   */
  private async recoverStrandedJobs() {
    try {
      const strandedCampaigns = await this.prisma.campaign.findMany({
        where: { status: 'RUNNING' },
      });
      for (const camp of strandedCampaigns) {
        this.logger.warn(`Interruption detected: Campaign "${camp.name}" (${camp.id}) was left RUNNING. Setting to PAUSED for seamless checkpoint resume.`);
        await this.prisma.campaign.update({
          where: { id: camp.id },
          data: { status: 'PAUSED' },
        });
      }

      const strandedAdders = await this.prisma.addMembersTask.findMany({
        where: { status: 'RUNNING' },
      });
      for (const task of strandedAdders) {
        this.logger.warn(`Interruption detected: Adder Task "${task.name}" (${task.id}) was left RUNNING. Setting to PAUSED.`);
        await this.prisma.addMembersTask.update({
          where: { id: task.id },
          data: { status: 'PAUSED' },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Checkpoint recovery check bypassed: ${err.message}`);
    }
  }

  /**
   * Dispatch campaign job to BullMQ or resilient in-memory engine
   */
  async addCampaignJob(payload: CampaignJobPayload) {
    if (this.isRedisConnected && this.campaignQueue) {
      this.logger.log(`Enqueuing campaign ${payload.campaignId} into BullMQ distributed queue`);
      await this.campaignQueue.add('process_campaign', payload, {
        jobId: `campaign_${payload.campaignId}_${Date.now()}`,
        removeOnComplete: true,
      });
    } else {
      this.logger.log(`Processing campaign ${payload.campaignId} via resilient in-memory engine`);
      this.campaignProcessor.processCampaign(payload.campaignId, payload.runId, payload.userId).catch((err) => {
        this.logger.error(`In-memory campaign execution error: ${err.message}`);
      });
    }
  }

  /**
   * Dispatch member adder job to BullMQ or resilient in-memory engine
   */
  async addAdderJob(payload: AdderJobPayload) {
    if (this.isRedisConnected && this.adderQueue) {
      this.logger.log(`Enqueuing adder task ${payload.taskId} into BullMQ distributed queue`);
      await this.adderQueue.add('process_adder', payload, {
        jobId: `adder_${payload.taskId}_${Date.now()}`,
        removeOnComplete: true,
      });
    } else {
      this.logger.log(`Processing adder task ${payload.taskId} via resilient in-memory engine`);
      this.adderProcessor.processTask(payload.taskId, payload.userId).catch((err) => {
        this.logger.error(`In-memory adder execution error: ${err.message}`);
      });
    }
  }

  /**
   * Dispatch scraper job to BullMQ or resilient in-memory engine
   */
  async addScraperJob(payload: ScraperJobPayload) {
    if (this.isRedisConnected && this.scraperQueue) {
      this.logger.log(`Enqueuing scraper job for ${payload.groupUsernameOrLink} into BullMQ queue`);
      await this.scraperQueue.add('process_scraper', payload, {
        jobId: `scraper_${Date.now()}`,
        removeOnComplete: true,
      });
    } else {
      this.scraperProcessor.processScraping(payload).catch((err) => {
        this.logger.error(`In-memory scraper execution error: ${err.message}`);
      });
    }
  }

  async onModuleDestroy() {
    // Abort all active executions
    for (const [id, exec] of this.activeExecutions.entries()) {
      exec.abortController.abort();
    }
    this.activeExecutions.clear();

    if (this.campaignWorker) await this.campaignWorker.close();
    if (this.adderWorker) await this.adderWorker.close();
    if (this.scraperWorker) await this.scraperWorker.close();

    if (this.campaignQueue) await this.campaignQueue.close();
    if (this.adderQueue) await this.adderQueue.close();
    if (this.scraperQueue) await this.scraperQueue.close();
    if (this.healthQueue) await this.healthQueue.close();
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {}
    }
  }

  /**
   * Register an execution for cancellation
   */
  registerExecution(id: string, type: string): AbortSignal {
    const abortController = new AbortController();
    this.activeExecutions.set(id, { abortController, type });
    return abortController.signal;
  }

  /**
   * Cancel an active running job by id
   */
  cancelExecution(id: string): boolean {
    const exec = this.activeExecutions.get(id);
    if (exec) {
      exec.abortController.abort();
      this.activeExecutions.delete(id);
      this.logger.log(`Cancelled execution for ${exec.type} ${id}`);
      this.wsGateway.emitLog('WARN', `Cancelled task execution: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Check if a job is currently active
   */
  isExecuting(id: string): boolean {
    return this.activeExecutions.has(id);
  }

  /**
   * Unregister finished execution
   */
  finishExecution(id: string) {
    this.activeExecutions.delete(id);
  }

  /**
   * Global Emergency Circuit Breaker Flag
   */
  public isEmergencyHalted = false;

  /**
   * Triggers Global Emergency Circuit Breaker to instantly halt all Telegram activities
   */
  async triggerEmergencyCircuitBreaker(enable: boolean, adminUserId: string) {
    this.isEmergencyHalted = enable;

    if (enable) {
      this.logger.warn(`GLOBAL EMERGENCY CIRCUIT BREAKER ACTIVATED by Admin ${adminUserId}. Aborting all executions.`);
      // 1. Abort all active executions in memory
      for (const [id, exec] of this.activeExecutions.entries()) {
        exec.abortController.abort();
      }
      this.activeExecutions.clear();

      // 2. Pause all running campaigns in database
      await this.prisma.campaign.updateMany({
        where: { status: 'RUNNING' },
        data: { status: 'PAUSED' },
      });

      // 3. Pause BullMQ queues if connected
      if (this.campaignQueue) await this.campaignQueue.pause();
      if (this.adderQueue) await this.adderQueue.pause();
      if (this.scraperQueue) await this.scraperQueue.pause();

      // 4. Emit emergency alert to all clients via WebSocket
      this.wsGateway.server.emit('system:emergency_alert', {
        halted: true,
        message: 'Global Telegram emergency circuit breaker activated. All campaigns paused.',
        timestamp: new Date().toISOString(),
      });
    } else {
      this.logger.log(`GLOBAL EMERGENCY CIRCUIT BREAKER DEACTIVATED by Admin ${adminUserId}. Resuming queues.`);
      if (this.campaignQueue) await this.campaignQueue.resume();
      if (this.adderQueue) await this.adderQueue.resume();
      if (this.scraperQueue) await this.scraperQueue.resume();

      this.wsGateway.server.emit('system:emergency_alert', {
        halted: false,
        message: 'Global Telegram operations resumed.',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      isEmergencyHalted: this.isEmergencyHalted,
      message: enable
        ? 'Emergency circuit breaker activated. All execution stopped.'
        : 'Emergency circuit breaker deactivated. System normal.',
    };
  }

  /**
   * Get detailed BullMQ queue counts and worker statuses
   */
  async getDetailedQueueStatus() {
    const counts = {
      campaigns: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      adder: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      scraper: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    };

    if (this.isRedisConnected) {
      try {
        if (this.campaignQueue) {
          counts.campaigns = await this.campaignQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed') as any;
        }
        if (this.adderQueue) {
          counts.adder = await this.adderQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed') as any;
        }
        if (this.scraperQueue) {
          counts.scraper = await this.scraperQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed') as any;
        }
      } catch (err: any) {
        this.logger.warn(`Error fetching BullMQ counts: ${err.message}`);
      }
    }

    return {
      isRedisConnected: this.isRedisConnected,
      isEmergencyHalted: this.isEmergencyHalted,
      activeInMemoryJobs: this.activeExecutions.size,
      counts,
    };
  }

  /**
   * Retries all failed jobs across queues
   */
  async retryAllFailedJobs() {
    let retried = 0;
    if (this.isRedisConnected) {
      if (this.campaignQueue) {
        const failed = await this.campaignQueue.getFailed();
        for (const job of failed) {
          await job.retry();
          retried++;
        }
      }
      if (this.adderQueue) {
        const failed = await this.adderQueue.getFailed();
        for (const job of failed) {
          await job.retry();
          retried++;
        }
      }
    }
    return { retriedCount: retried, success: true };
  }

  /**
   * Get real-time queue metrics
   */
  async getMetrics() {
    return {
      redisConnected: this.isRedisConnected,
      isEmergencyHalted: this.isEmergencyHalted,
      activeInMemoryJobs: this.activeExecutions.size,
      activeJobsList: Array.from(this.activeExecutions.entries()).map(([id, exec]) => ({
        id,
        type: exec.type,
      })),
    };
  }
}

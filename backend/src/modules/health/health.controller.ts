import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueueService } from '../queue/queue.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  async checkHealth() {
    let dbStatus = 'UP';
    let dbLatencyMs = 0;
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'DOWN';
    }

    const queueMetrics = await this.queueService.getMetrics();

    return {
      status: dbStatus === 'UP' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      services: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        queueEngine: {
          redisConnected: queueMetrics.redisConnected,
          activeJobs: queueMetrics.activeInMemoryJobs,
        },
      },
    };
  }

  @Get('metrics')
  async getMetrics() {
    const [
      totalAccounts,
      activeAccounts,
      floodWaitAccounts,
      totalCampaigns,
      runningCampaigns,
      totalGroups,
      totalScrapedMembers,
      totalProxies,
    ] = await Promise.all([
      this.prisma.telegramAccount.count(),
      this.prisma.telegramAccount.count({ where: { status: 'ACTIVE' } }),
      this.prisma.telegramAccount.count({ where: { status: 'FLOOD_WAIT' } }),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: 'RUNNING' } }),
      this.prisma.groupTarget.count(),
      this.prisma.scrapedMember.count(),
      this.prisma.proxy.count(),
    ]);

    const queueMetrics = await this.queueService.getMetrics();

    return {
      overview: {
        totalAccounts,
        activeAccounts,
        floodWaitAccounts,
        totalCampaigns,
        runningCampaigns,
        totalGroups,
        totalScrapedMembers,
        totalProxies,
      },
      queue: queueMetrics,
      timestamp: new Date().toISOString(),
    };
  }
}

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TelegramEngineService } from '../../telegram/telegram-engine.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { QueueService, ScraperJobPayload } from '../queue.service';

@Injectable()
export class ScraperProcessor {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
  ) {}

  async processScraping(payload: ScraperJobPayload) {
    const jobKey = `SCRAPER_${payload.groupUsernameOrLink}`;
    this.queueService.registerExecution(jobKey, 'SCRAPER');

    try {
      this.logger.log(`Starting background scrape for group: ${payload.groupUsernameOrLink}`);
      this.wsGateway.emitLog('INFO', `Connecting with account ${payload.phone} to scrape ${payload.groupUsernameOrLink}...`);

      const account = await this.prisma.telegramAccount.findUnique({
        where: { phone: payload.phone },
        include: { proxy: true },
      });

      if (!account || !account.sessionString) {
        throw new Error('Authorized account not found for phone ' + payload.phone);
      }

      const client = await this.tgEngine.getClient(
        account.phone,
        account.apiId,
        account.apiHash,
        account.sessionString,
        account.proxy,
      );

      const scraped = await this.tgEngine.scrapeGroupMembers(
        client,
        payload.groupUsernameOrLink,
        payload.limit || 2000,
      );

      // Upsert group record
      const group = await this.prisma.groupTarget.upsert({
        where: { id: payload.groupId || 'non-existent' },
        update: {
          title: scraped.group.title,
          username: scraped.group.username,
          chatId: scraped.group.chatId,
          memberCount: scraped.members.length,
          scrapedAt: new Date(),
        },
        create: {
          userId: payload.userId || account.userId,
          title: scraped.group.title,
          username: scraped.group.username,
          chatId: scraped.group.chatId,
          memberCount: scraped.members.length,
          scrapedAt: new Date(),
        },
      });

      // Upsert members
      let savedCount = 0;
      for (const m of scraped.members) {
        try {
          await this.prisma.scrapedMember.upsert({
            where: {
              groupId_userId: {
                groupId: group.id,
                userId: m.userId,
              },
            },
            update: {
              accessHash: m.accessHash,
              username: m.username,
              firstName: m.firstName,
              lastName: m.lastName,
              phone: m.phone,
              status: m.status,
              isBot: m.isBot,
              isScam: m.isScam,
            },
            create: {
              groupId: group.id,
              userId: m.userId,
              accessHash: m.accessHash,
              username: m.username,
              firstName: m.firstName,
              lastName: m.lastName,
              phone: m.phone,
              status: m.status,
              isBot: m.isBot,
              isScam: m.isScam,
            },
          });
          savedCount++;
        } catch {}
      }

      this.wsGateway.emitLog('SUCCESS', `Successfully saved ${savedCount} members for group "${group.title}"`);
      return { group, savedCount };
    } catch (err: any) {
      this.logger.error(`Scraper worker error: ${err.message}`);
      this.wsGateway.emitLog('ERROR', `Scraping failed: ${err.message}`);
      throw err;
    } finally {
      this.queueService.finishExecution(jobKey);
    }
  }
}

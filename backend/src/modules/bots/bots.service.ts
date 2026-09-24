import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BotEngineService } from './bot-engine.service';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botEngine: BotEngineService,
  ) {}

  async listBots(userId: string) {
    return this.prisma.telegramBot.findMany({
      where: { userId },
      include: {
        _count: {
          select: { subscribers: true, broadcasts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBotDetails(botId: string, userId: string) {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
      include: {
        broadcasts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { subscribers: true, broadcasts: true },
        },
      },
    });

    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  async connectBot(
    userId: string,
    dto: {
      token: string;
      welcomeMessage?: string;
      autoReplyRules?: any;
    },
  ) {
    const cleanToken = dto.token.trim();
    // 1. Verify token with Telegram Bot API
    const botInfo = await this.botEngine.getMe(cleanToken);

    if (!botInfo) {
      throw new BadRequestException('Could not verify bot token with Telegram API');
    }

    const botIdStr = String(botInfo.id);

    // 2. Upsert into database
    const bot = await this.prisma.telegramBot.upsert({
      where: { token: cleanToken },
      update: {
        userId,
        botId: botIdStr,
        username: botInfo.username || null,
        firstName: botInfo.first_name || null,
        welcomeMessage: dto.welcomeMessage || null,
        autoReplyRules: dto.autoReplyRules ? JSON.stringify(dto.autoReplyRules) : null,
        isActive: true,
      },
      create: {
        userId,
        token: cleanToken,
        botId: botIdStr,
        username: botInfo.username || null,
        firstName: botInfo.first_name || null,
        welcomeMessage: dto.welcomeMessage || 'مرحباً بك! يسعدنا تواصلك مع البوت الرسمي.',
        autoReplyRules: dto.autoReplyRules ? JSON.stringify(dto.autoReplyRules) : null,
        isActive: true,
      },
    });

    return bot;
  }

  async updateBot(
    botId: string,
    userId: string,
    dto: {
      welcomeMessage?: string;
      autoReplyRules?: any;
      isActive?: boolean;
    },
  ) {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    return this.prisma.telegramBot.update({
      where: { id: bot.id },
      data: {
        welcomeMessage: dto.welcomeMessage !== undefined ? dto.welcomeMessage : bot.welcomeMessage,
        autoReplyRules: dto.autoReplyRules !== undefined ? JSON.stringify(dto.autoReplyRules) : bot.autoReplyRules,
        isActive: dto.isActive !== undefined ? dto.isActive : bot.isActive,
      },
    });
  }

  async deleteBot(botId: string, userId: string) {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    await this.prisma.telegramBot.delete({ where: { id: bot.id } });
    return { success: true, message: 'Bot deleted successfully' };
  }

  async listSubscribers(botId: string, userId: string) {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    return this.prisma.botSubscriber.findMany({
      where: { botId: bot.id },
      orderBy: { lastInteractionAt: 'desc' },
      take: 200,
    });
  }

  async createBroadcast(
    botId: string,
    userId: string,
    dto: {
      messageText: string;
      buttons?: any;
      mediaUrl?: string;
    },
  ) {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    const totalRecipients = await this.prisma.botSubscriber.count({
      where: { botId: bot.id, isBlocked: false },
    });

    const broadcast = await this.prisma.botBroadcast.create({
      data: {
        botId: bot.id,
        messageText: dto.messageText,
        buttons: dto.buttons ? JSON.stringify(dto.buttons) : null,
        mediaUrl: dto.mediaUrl || null,
        status: 'PENDING',
        totalRecipients,
      },
    });

    // Launch broadcast in background asynchronously
    setTimeout(() => {
      this.botEngine.executeBroadcast(broadcast.id).catch((err) => {
        this.logger.error(`Broadcast failed: ${err.message}`);
      });
    }, 100);

    return broadcast;
  }

  async listBroadcasts(botId: string, userId: string) {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    return this.prisma.botBroadcast.findMany({
      where: { botId: bot.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Export bot subscribers to CSV with UTF-8 BOM
   */
  async exportSubscribersCsv(botId: string, userId: string): Promise<string> {
    const bot = await this.prisma.telegramBot.findFirst({
      where: { id: botId, userId },
      include: { subscribers: true },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    const headers = ['Telegram Chat ID', 'Username', 'First Name', 'Last Name', 'Tags', 'Joined At', 'Status'];
    const rows = bot.subscribers.map((s) => [
      s.telegramUserId,
      s.username ? `@${s.username}` : '',
      `"${(s.firstName || '').replace(/"/g, '""')}"`,
      `"${(s.lastName || '').replace(/"/g, '""')}"`,
      `"${(s.tags || '').replace(/"/g, '""')}"`,
      s.createdAt.toISOString(),
      s.isBlocked ? 'Blocked' : 'Active',
    ]);

    const csvLines = [headers.join(','), ...rows.map((r) => r.join(','))];
    return '\uFEFF' + csvLines.join('\n');
  }
}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface TelegramBotMeResponse {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    supports_inline_queries: boolean;
  };
  description?: string;
}

@Injectable()
export class BotEngineService {
  private readonly logger = new Logger(BotEngineService.name);
  private readonly baseUrl = 'https://api.telegram.org';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates a BotFather token and retrieves official bot details via Telegram Bot API
   */
  async getMe(token: string): Promise<TelegramBotMeResponse['result']> {
    try {
      const url = `${this.baseUrl}/bot${token}/getMe`;
      const res = await fetch(url, { method: 'GET' });
      const data: TelegramBotMeResponse = await res.json();

      if (!data.ok || !data.result) {
        throw new BadRequestException(data.description || 'Invalid Telegram Bot Token');
      }

      return data.result;
    } catch (err: any) {
      this.logger.error(`getMe failed for token: ${err.message}`);
      throw new BadRequestException(err.message || 'Failed to connect to Telegram Bot API');
    }
  }

  /**
   * Sets the Webhook URL for the bot
   */
  async setWebhook(token: string, webhookUrl: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/bot${token}/setWebhook`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
      });
      const data = await res.json();
      return !!data.ok;
    } catch (err: any) {
      this.logger.warn(`Failed to set webhook: ${err.message}`);
      return false;
    }
  }

  /**
   * Sends an official message via Telegram Bot API
   */
  async sendMessage(
    token: string,
    chatId: string | number,
    text: string,
    options?: { reply_markup?: any; parse_mode?: string },
  ) {
    try {
      const url = `${this.baseUrl}/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: options?.parse_mode || 'HTML',
          reply_markup: options?.reply_markup,
        }),
      });
      return await res.json();
    } catch (err: any) {
      this.logger.error(`sendMessage failed to ${chatId}: ${err.message}`);
      return { ok: false, description: err.message };
    }
  }

  /**
   * Processes incoming Telegram webhook update (/start, keywords, inline button callbacks)
   */
  async handleIncomingUpdate(botId: string, update: any) {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id: botId },
    });
    if (!bot || !bot.isActive) return { ok: false, message: 'Bot inactive or not found' };

    // 1. Process standard message
    if (update.message) {
      const msg = update.message;
      const from = msg.from;
      const chatId = msg.chat?.id;
      const text = msg.text?.trim() || '';

      if (from && chatId) {
        // Record / Upsert Subscriber (Lead Capture)
        await this.prisma.botSubscriber.upsert({
          where: {
            botId_telegramUserId: {
              botId: bot.id,
              telegramUserId: String(from.id),
            },
          },
          update: {
            username: from.username || null,
            firstName: from.first_name || null,
            lastName: from.last_name || null,
            lastInteractionAt: new Date(),
          },
          create: {
            botId: bot.id,
            telegramUserId: String(from.id),
            username: from.username || null,
            firstName: from.first_name || null,
            lastName: from.last_name || null,
          },
        });

        // Update total subscriber count on the bot record
        const count = await this.prisma.botSubscriber.count({ where: { botId: bot.id } });
        await this.prisma.telegramBot.update({
          where: { id: bot.id },
          data: { subscriberCount: count },
        });

        // Check /start command
        if (text.startsWith('/start')) {
          const welcome = bot.welcomeMessage || `مرحباً بك ${from.first_name || ''}! يسعدنا انضمامك إلى البوت الرسمي.`;
          
          let keyboard: any = undefined;
          if (bot.autoReplyRules) {
            try {
              const rules = JSON.parse(bot.autoReplyRules);
              if (rules.defaultButtons && Array.isArray(rules.defaultButtons)) {
                keyboard = { inline_keyboard: rules.defaultButtons };
              }
            } catch {}
          }

          await this.sendMessage(bot.token, chatId, welcome, { reply_markup: keyboard });
          return { ok: true, action: 'WELCOME_SENT' };
        }

        // Check Auto-Reply Keywords
        if (bot.autoReplyRules) {
          try {
            const rules = JSON.parse(bot.autoReplyRules);
            if (rules.keywords && Array.isArray(rules.keywords)) {
              for (const rule of rules.keywords) {
                if (rule.trigger && text.toLowerCase().includes(rule.trigger.toLowerCase())) {
                  await this.sendMessage(bot.token, chatId, rule.response, {
                    reply_markup: rule.buttons ? { inline_keyboard: rule.buttons } : undefined,
                  });
                  return { ok: true, action: 'KEYWORD_REPLIED' };
                }
              }
            }
          } catch {}
        }
      }
    }

    // 2. Process callback query (inline button clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data;

      // Answer callback query so button stops loading
      try {
        await fetch(`${this.baseUrl}/bot${bot.token}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: cb.id }),
        });
      } catch {}

      if (chatId && data && bot.autoReplyRules) {
        try {
          const rules = JSON.parse(bot.autoReplyRules);
          if (rules.callbackActions && rules.callbackActions[data]) {
            const action = rules.callbackActions[data];
            await this.sendMessage(bot.token, chatId, action.response, {
              reply_markup: action.buttons ? { inline_keyboard: action.buttons } : undefined,
            });
          }
        } catch {}
      }
    }

    return { ok: true };
  }

  /**
   * Executes a mass broadcast to all bot subscribers
   */
  async executeBroadcast(broadcastId: string) {
    const broadcast = await this.prisma.botBroadcast.findUnique({
      where: { id: broadcastId },
      include: { bot: true },
    });

    if (!broadcast || broadcast.status === 'PROCESSING') return;

    await this.prisma.botBroadcast.update({
      where: { id: broadcast.id },
      data: { status: 'PROCESSING' },
    });

    const subscribers = await this.prisma.botSubscriber.findMany({
      where: { botId: broadcast.botId, isBlocked: false },
    });

    let successCount = 0;
    let failedCount = 0;

    let inlineKeyboard: any = undefined;
    if (broadcast.buttons) {
      try {
        inlineKeyboard = JSON.parse(broadcast.buttons);
      } catch {}
    }

    for (const sub of subscribers) {
      const res = await this.sendMessage(
        broadcast.bot.token,
        sub.telegramUserId,
        broadcast.messageText,
        { reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined },
      );

      if (res.ok) {
        successCount++;
      } else {
        failedCount++;
        // If user blocked the bot, flag subscriber
        if (res.description && (res.description.includes('blocked') || res.description.includes('deactivated'))) {
          await this.prisma.botSubscriber.update({
            where: { id: sub.id },
            data: { isBlocked: true },
          });
        }
      }

      // Respect rate limit: 30 messages per second limit for Telegram Bot API
      await new Promise((resolve) => setTimeout(resolve, 35));
    }

    await this.prisma.botBroadcast.update({
      where: { id: broadcast.id },
      data: {
        status: 'COMPLETED',
        successCount,
        failedCount,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Broadcast ${broadcast.id} completed. Success: ${successCount}, Failed: ${failedCount}`);
  }
}

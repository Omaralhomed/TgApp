import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramEngineService } from '../telegram/telegram-engine.service';
import { EventsGateway } from '../websocket/events.gateway';
import { NewMessage } from 'telegram/events';
import { TelegramClient } from 'telegram';

export interface ReplacementRule {
  from: string;
  to: string;
}

export interface CloneHistoryDto {
  sourceChannel: string;
  targetChannel: string;
  limit?: number;
  replacements?: ReplacementRule[];
  accountId?: string;
  watermark?: string;
}

export interface StartMirrorDto {
  sourceChannel: string;
  targetChannel: string;
  replacements?: ReplacementRule[];
  accountId?: string;
  watermark?: string;
}

interface ActiveMirrorSession {
  id: string;
  userId: string;
  accountId: string;
  sourceChannel: string;
  targetChannel: string;
  replacements: ReplacementRule[];
  watermark?: string;
  startedAt: string;
  mirroredCount: number;
  client: TelegramClient;
  handler: any;
}

@Injectable()
export class ChannelClonerService {
  private readonly logger = new Logger(ChannelClonerService.name);
  private activeMirrors = new Map<string, ActiveMirrorSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tgEngine: TelegramEngineService,
    private readonly wsGateway: EventsGateway,
  ) {}

  private cleanChannelIdentifier(input: string): string {
    let clean = input.trim();
    const match = clean.match(/(?:t\.me\/|telegram\.me\/)?([a-zA-Z0-9_+-]+)/);
    if (match && match[1]) {
      clean = match[1];
    }
    if (!clean.startsWith('@') && !clean.startsWith('+')) {
      clean = `@${clean}`;
    }
    return clean;
  }

  private applyReplacements(text: string, replacements?: ReplacementRule[], watermark?: string): string {
    let result = text || '';
    if (replacements && replacements.length > 0) {
      for (const rule of replacements) {
        if (!rule.from) continue;
        const escaped = rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        result = result.replace(regex, rule.to || '');
      }
    }
    if (watermark && watermark.trim()) {
      result = `${result.trim()}\n\n${watermark.trim()}`;
    }
    return result.trim();
  }

  private async getAccountClient(userId: string, accountId?: string) {
    let account;
    if (accountId) {
      account = await this.prisma.telegramAccount.findFirst({
        where: { id: accountId, userId, status: 'ACTIVE' },
        include: { proxy: true },
      });
    } else {
      account = await this.prisma.telegramAccount.findFirst({
        where: { userId, status: 'ACTIVE', sessionString: { not: null } },
        include: { proxy: true },
        orderBy: { healthScore: 'desc' },
      });
    }

    if (!account || !account.sessionString) {
      throw new BadRequestException('No active Telegram account available with a valid session');
    }

    const client = await this.tgEngine.getClient(
      account.phone,
      account.apiId,
      account.apiHash,
      account.sessionString,
      account.proxy,
    );

    return { account, client };
  }

  /**
   * Clones the last N posts from sourceChannel into targetChannel with link/mention rewrite
   */
  async cloneChannelHistory(userId: string, dto: CloneHistoryDto) {
    const { sourceChannel, targetChannel, limit = 20, replacements = [], accountId, watermark } = dto;
    const cleanSource = this.cleanChannelIdentifier(sourceChannel);
    const cleanTarget = this.cleanChannelIdentifier(targetChannel);

    const { account, client } = await this.getAccountClient(userId, accountId);

    this.logger.log(`User ${userId} starting history clone from ${cleanSource} to ${cleanTarget}`);
    this.wsGateway.emitUserLog(userId, 'INFO', `Starting clone from ${cleanSource} to ${cleanTarget} (${limit} posts)`);

    const sourceEntity = await client.getEntity(cleanSource);
    const targetEntity = await client.getEntity(cleanTarget);

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const messages = await client.getMessages(sourceEntity, { limit: safeLimit });

    // Reverse to process chronologically (oldest to newest)
    const chronologicalMessages = [...messages].reverse();
    let clonedCount = 0;

    for (let i = 0; i < chronologicalMessages.length; i++) {
      const msg = chronologicalMessages[i];
      const rawText = msg.message || '';
      const rewrittenText = this.applyReplacements(rawText, replacements, watermark);

      try {
        if (msg.media) {
          await client.sendFile(targetEntity, {
            file: msg.media,
            caption: rewrittenText,
          });
        } else if (rewrittenText.length > 0) {
          await client.sendMessage(targetEntity, {
            message: rewrittenText,
          });
        }
        clonedCount++;

        const progressPercent = Math.round(((i + 1) / chronologicalMessages.length) * 100);
        this.wsGateway.emitToUser(userId, 'cloner:progress', {
          current: i + 1,
          total: chronologicalMessages.length,
          percentage: progressPercent,
        });

        // Anti-flood jitter delay
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err: any) {
        this.logger.warn(`Failed to clone post #${msg.id}: ${err.message}`);
        this.wsGateway.emitUserLog(userId, 'WARN', `Failed to mirror post #${msg.id}: ${err.message}`);
      }
    }

    this.wsGateway.emitUserLog(userId, 'SUCCESS', `Successfully cloned ${clonedCount} posts to ${cleanTarget}`);
    return {
      success: true,
      clonedCount,
      total: chronologicalMessages.length,
      source: cleanSource,
      target: cleanTarget,
    };
  }

  /**
   * Starts a real-time mirroring daemon for a source channel
   */
  async startRealtimeMirror(userId: string, dto: StartMirrorDto) {
    const { sourceChannel, targetChannel, replacements = [], accountId, watermark } = dto;
    const cleanSource = this.cleanChannelIdentifier(sourceChannel);
    const cleanTarget = this.cleanChannelIdentifier(targetChannel);

    const mirrorId = `mirror_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const { account, client } = await this.getAccountClient(userId, accountId);

    const sourceEntity = await client.getEntity(cleanSource);
    const targetEntity = await client.getEntity(cleanTarget);

    const handler = async (event: any) => {
      try {
        const msg = event.message;
        if (!msg) return;

        const session = this.activeMirrors.get(mirrorId);
        if (!session) return;

        const rawText = msg.message || '';
        const rewrittenText = this.applyReplacements(rawText, session.replacements, session.watermark);

        if (msg.media) {
          await client.sendFile(targetEntity, {
            file: msg.media,
            caption: rewrittenText,
          });
        } else if (rewrittenText.length > 0) {
          await client.sendMessage(targetEntity, {
            message: rewrittenText,
          });
        }

        session.mirroredCount++;
        this.wsGateway.emitToUser(userId, 'cloner:new_mirrored_post', {
          mirrorId,
          sourceChannel: cleanSource,
          targetChannel: cleanTarget,
          mirroredCount: session.mirroredCount,
          date: new Date().toISOString(),
        });

        this.wsGateway.emitUserLog(userId, 'INFO', `Mirrored new post from ${cleanSource} to ${cleanTarget}`);
      } catch (mirrorErr: any) {
        this.logger.warn(`Mirror handler error: ${mirrorErr.message}`);
      }
    };

    client.addEventHandler(handler, new NewMessage({ chats: [sourceEntity] }));

    const session: ActiveMirrorSession = {
      id: mirrorId,
      userId,
      accountId: account.id,
      sourceChannel: cleanSource,
      targetChannel: cleanTarget,
      replacements,
      watermark,
      startedAt: new Date().toISOString(),
      mirroredCount: 0,
      client,
      handler,
    };

    this.activeMirrors.set(mirrorId, session);
    this.logger.log(`Real-time mirror started: ${mirrorId} (${cleanSource} -> ${cleanTarget})`);

    return {
      success: true,
      mirrorId,
      sourceChannel: cleanSource,
      targetChannel: cleanTarget,
      startedAt: session.startedAt,
    };
  }

  /**
   * Stops an active real-time mirroring session
   */
  async stopRealtimeMirror(userId: string, mirrorId: string) {
    const session = this.activeMirrors.get(mirrorId);
    if (!session) {
      throw new NotFoundException('Mirror session not found');
    }
    if (session.userId !== userId) {
      throw new BadRequestException('Unauthorized to modify this mirror session');
    }

    try {
      session.client.removeEventHandler(session.handler, new NewMessage({}));
    } catch {}

    this.activeMirrors.delete(mirrorId);
    this.wsGateway.emitUserLog(userId, 'INFO', `Stopped real-time mirror ${session.sourceChannel} -> ${session.targetChannel}`);

    return {
      success: true,
      message: 'Mirror session stopped',
      mirrorId,
      mirroredCount: session.mirroredCount,
    };
  }

  /**
   * Lists active real-time mirror sessions for a user
   */
  listUserMirrors(userId: string) {
    const results = [];
    for (const [id, session] of this.activeMirrors.entries()) {
      if (session.userId === userId) {
        results.push({
          id,
          sourceChannel: session.sourceChannel,
          targetChannel: session.targetChannel,
          replacements: session.replacements,
          watermark: session.watermark,
          startedAt: session.startedAt,
          mirroredCount: session.mirroredCount,
        });
      }
    }
    return results;
  }
}

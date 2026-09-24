import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { NewMessage } from 'telegram/events';
import { EventsGateway } from '../websocket/events.gateway';
import { CryptoService } from '../../common/crypto/crypto.service';
import { TelegramPolicyEngine } from './telegram-policy.service';
import * as fs from 'fs';
import * as path from 'path';

export interface TelegramClientOptions {
  apiId: number;
  apiHash: string;
  sessionString?: string;
  proxy?: {
    ip: string;
    port: number;
    socksType?: 5;
    username?: string;
    password?: string;
  };
}

export interface TelegramAppProfile {
  apiId: number;
  apiHash: string;
  appName: string;
  deviceModel: string;
  systemVersion: string;
  appVersion: string;
  systemLangCode: string;
  langCode: string;
}

export const DEFAULT_TELEGRAM_API_ID = Number(process.env.DEFAULT_TELEGRAM_API_ID) || 2040;
export const DEFAULT_TELEGRAM_API_HASH = process.env.DEFAULT_TELEGRAM_API_HASH || 'b18441a1ff607e10a989891a5462e627';

export const OFFICIAL_APP_POOLS: TelegramAppProfile[] = [
  {
    apiId: 6,
    apiHash: 'eb06d4abfb49dc3eeb1aeb98ae0f581e',
    appName: 'Telegram Android',
    deviceModel: 'Samsung Galaxy S24 Ultra',
    systemVersion: 'Android 14 (OneUI 6.1)',
    appVersion: '10.14.5',
    systemLangCode: 'en-US',
    langCode: 'en',
  },
  {
    apiId: 21724,
    apiHash: '3e0cb5efcd52300aec5994f2534bd62b',
    appName: 'Telegram Android X',
    deviceModel: 'Google Pixel 8 Pro',
    systemVersion: 'Android 14 (UP1A.231105)',
    appVersion: '0.26.8',
    systemLangCode: 'en-US',
    langCode: 'en',
  },
  {
    apiId: 10840,
    apiHash: '70d03222a76f571b78ec968f9a200f89',
    appName: 'Telegram iOS',
    deviceModel: 'iPhone 15 Pro Max',
    systemVersion: 'iOS 17.5.1',
    appVersion: '10.14.1',
    systemLangCode: 'en-US',
    langCode: 'en',
  },
  {
    apiId: 2040,
    apiHash: 'b18441a1ff607e10a989891a5462e627',
    appName: 'Telegram Desktop',
    deviceModel: 'PC 64bit',
    systemVersion: 'Windows 11 Build 22631',
    appVersion: '5.2.2 x64',
    systemLangCode: 'en-US',
    langCode: 'en',
  },
  {
    apiId: 2834,
    apiHash: '68875f756c9b437a8b916ca3de22e031',
    appName: 'Telegram macOS',
    deviceModel: 'MacBookPro18,1',
    systemVersion: 'macOS Sonoma 14.5',
    appVersion: '10.14.0',
    systemLangCode: 'en-US',
    langCode: 'en',
  },
  {
    apiId: 2496,
    apiHash: '8da85b0d5b16521824047163db152423',
    appName: 'Telegram Web (K)',
    deviceModel: 'Chrome 126.0 (Windows NT 10.0)',
    systemVersion: 'Windows NT 10.0; Win64; x64',
    appVersion: '2.1.0',
    systemLangCode: 'en-US',
    langCode: 'en',
  },
];

export function getAppAndDeviceProfileForPhone(
  phone: string,
  userApiId?: number,
  userApiHash?: string,
): TelegramAppProfile {
  // If user provided their own custom API credentials, match with a realistic profile
  if (userApiId && userApiHash && Number(userApiId) > 0 && userApiHash.trim().length > 0) {
    const matched = OFFICIAL_APP_POOLS.find((p) => p.apiId === Number(userApiId));
    if (matched) {
      return {
        ...matched,
        apiId: Number(userApiId),
        apiHash: userApiHash.trim(),
      };
    }
    // Generic fallback for custom developer API ID
    return {
      apiId: Number(userApiId),
      apiHash: userApiHash.trim(),
      appName: 'Custom Developer App',
      deviceModel: 'Samsung Galaxy S24 Ultra',
      systemVersion: 'Android 14',
      appVersion: '10.14.0',
      systemLangCode: 'en',
      langCode: 'en',
    };
  }

  // Deterministically select an official profile based on phone number hash
  // This guarantees that the same phone always uses the SAME app ID & fingerprint across logins
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = (hash << 5) - hash + phone.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % OFFICIAL_APP_POOLS.length;
  return OFFICIAL_APP_POOLS[index];
}

export function getDeviceProfileForPhone(phone: string) {
  return getAppAndDeviceProfileForPhone(phone);
}

@Injectable()
export class TelegramEngineService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramEngineService.name);
  private activeClients = new Map<string, TelegramClient>();
  private clientLastActive = new Map<string, number>();
  private inboxListeners = new Set<string>();
  private pendingAuthFlows = new Map<
    string,
    {
      client: TelegramClient;
      phoneCodeHash: string;
      phone: string;
      apiId: number;
      apiHash: string;
      createdAt: number;
    }
  >();

  constructor(
    private readonly wsGateway: EventsGateway,
    private readonly cryptoService: CryptoService,
    public readonly policyEngine: TelegramPolicyEngine,
  ) {
    // Periodically clean up stale pending auth flows & idle connections to prevent memory bloat (OOM)
    setInterval(() => {
      this.cleanupStalePendingAuth();
      this.cleanupIdleClients();
    }, 60000);
  }

  /**
   * Touch client timestamp to keep it alive during active execution
   */
  public touchClient(phone: string) {
    this.clientLastActive.set(phone, Date.now());
  }

  /**
   * Client Pool Memory Management:
   * Disconnects and reclaims memory for accounts that have been idle for more than 5 minutes.
   * If a campaign or task needs the account later, getClient will automatically reconnect in milliseconds.
   */
  private async cleanupIdleClients(maxIdleMinutes: number = 5) {
    const now = Date.now();
    const threshold = maxIdleMinutes * 60 * 1000;

    for (const [phone, client] of this.activeClients.entries()) {
      const lastActive = this.clientLastActive.get(phone) || 0;
      if (now - lastActive > threshold) {
        try {
          await client.disconnect();
          this.logger.log(`RAM optimization: Disconnected idle Telegram client for ${phone} (> ${maxIdleMinutes}m idle)`);
        } catch (err: any) {
          this.logger.warn(`Error disconnecting idle client for ${phone}: ${err.message}`);
        }
        this.activeClients.delete(phone);
        this.clientLastActive.delete(phone);
      }
    }
  }

  private cleanupStalePendingAuth() {
    const now = Date.now();
    for (const [phone, pending] of this.pendingAuthFlows.entries()) {
      if (now - pending.createdAt > 10 * 60 * 1000) {
        try {
          pending.client.disconnect();
        } catch {}
        this.pendingAuthFlows.delete(phone);
        this.logger.log(`Cleaned up expired pending auth flow for ${phone}`);
      }
    }
  }

  /**
   * Helper to safely disconnect and clean up TelegramClient connections
   */
  async disconnectClient(phone: string) {
    if (this.activeClients.has(phone)) {
      const client = this.activeClients.get(phone)!;
      try {
        await client.disconnect();
        this.logger.log(`Disconnected active Telegram client for ${phone}`);
      } catch (err: any) {
        this.logger.warn(`Error disconnecting client for ${phone}: ${err.message}`);
      }
      this.activeClients.delete(phone);
      this.clientLastActive.delete(phone);
    }
    if (this.pendingAuthFlows.has(phone)) {
      const pending = this.pendingAuthFlows.get(phone)!;
      try {
        await pending.client.disconnect();
      } catch {}
      this.pendingAuthFlows.delete(phone);
    }
  }

  async onModuleDestroy() {
    for (const [phone, client] of this.activeClients.entries()) {
      try {
        await client.disconnect();
      } catch {}
    }
    this.activeClients.clear();
    this.clientLastActive.clear();
  }

  /**
   * Helper to format and sanitize proxy configurations for GramJS
   */
  private formatProxy(proxy?: any) {
    if (!proxy || !proxy.host || !proxy.port) return undefined;
    const cleanHost = proxy.host.replace(/^https?:\/\//i, '').replace(/^socks[45]:\/\//i, '').replace(/\/.*$/, '');
    const isSocks4 = String(proxy.protocol || '').toLowerCase() === 'socks4';
    const decryptedPassword = proxy.password ? this.cryptoService.decrypt(proxy.password) : undefined;
    return {
      ip: cleanHost,
      port: Number(proxy.port),
      socksType: (isSocks4 ? 4 : 5) as (4 | 5),
      username: proxy.username || undefined,
      password: decryptedPassword,
    };
  }

  /**
   * Step 1 of Auth Flow: Initiate login and request SMS/Telegram verification code
   */
  async initiatePhoneAuth(phone: string, apiId?: number, apiHash?: string, proxy?: any) {
    const profile = getAppAndDeviceProfileForPhone(phone, apiId, apiHash);
    const effectiveApiId = profile.apiId;
    const effectiveApiHash = profile.apiHash;

    this.logger.log(`Initiating MTProto login for phone: ${phone} using ${profile.appName} (API ID: ${effectiveApiId}, Device: ${profile.deviceModel})`);
    this.wsGateway.emitLog('INFO', `Connecting to Telegram MTProto servers for ${phone} via ${profile.appName}...`);

    const session = new StringSession('');
    const client = new TelegramClient(session, effectiveApiId, effectiveApiHash, {
      connectionRetries: 3,
      proxy: this.formatProxy(proxy),
      deviceModel: profile.deviceModel,
      systemVersion: profile.systemVersion,
      appVersion: profile.appVersion,
      systemLangCode: profile.systemLangCode,
      langCode: profile.langCode,
    });

    await client.connect();

    const sendCodeResult = await client.sendCode(
      {
        apiId: effectiveApiId,
        apiHash: effectiveApiHash,
      },
      phone,
    );

    this.pendingAuthFlows.set(phone, {
      client,
      phoneCodeHash: sendCodeResult.phoneCodeHash,
      phone,
      apiId: effectiveApiId,
      apiHash: effectiveApiHash,
      createdAt: Date.now(),
    });

    this.wsGateway.emitLog('SUCCESS', `Verification code successfully sent by Telegram to ${phone}`);
    return {
      phone,
      phoneCodeHash: sendCodeResult.phoneCodeHash,
      isCodeSent: true,
      usedDefaultApi: effectiveApiId === DEFAULT_TELEGRAM_API_ID,
    };
  }

  /**
   * Step 2 of Auth Flow: Verify code and optionally 2FA password to generate StringSession
   */
  async completePhoneAuth(phone: string, code: string, password2FA?: string) {
    const pending = this.pendingAuthFlows.get(phone);
    if (!pending) {
      throw new Error('No pending authentication flow found for this phone number. Please request code first.');
    }

    const { client, phoneCodeHash, apiId, apiHash } = pending;

    try {
      this.wsGateway.emitLog('INFO', `Signing in with code for ${phone}...`);
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phone,
          phoneCodeHash: phoneCodeHash,
          phoneCode: code,
        }),
      );
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
        if (!password2FA) {
          return {
            requires2FA: true,
            message: 'Two-Factor Authentication (2FA) password is required for this account.',
          };
        }

        this.wsGateway.emitLog('INFO', `Submitting 2FA password for ${phone}...`);
        await client.signInWithPassword(
          {
            apiId,
            apiHash,
          },
          {
            password: async () => password2FA || '',
            onError: (err: Error) => {
              throw err;
            },
          },
        );
      } else {
        this.wsGateway.emitLog('ERROR', `Sign in failed for ${phone}: ${err.message}`);
        throw err;
      }
    }

    const rawSessionString = client.session.save() as unknown as string;
    const encryptedSession = this.cryptoService.encrypt(rawSessionString);
    const me = (await client.getMe()) as any;

    this.activeClients.set(phone, client);
    this.pendingAuthFlows.delete(phone);

    this.wsGateway.emitLog('SUCCESS', `Account ${phone} authorized! Name: ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'N/A'})`);

    return {
      sessionString: encryptedSession,
      user: {
        id: me.id?.toString(),
        firstName: me.firstName,
        lastName: me.lastName,
        username: me.username,
        phone: me.phone,
      },
    };
  }

  /**
   * Get or spawn an active connected TelegramClient for an account
   */
  async getClient(phone: string, apiId: number, apiHash: string, encryptedSession: string, proxy?: any): Promise<TelegramClient> {
    if (this.activeClients.has(phone)) {
      const existing = this.activeClients.get(phone)!;
      if (existing.connected) {
        return existing;
      }
    }

    const rawSession = this.cryptoService.decrypt(encryptedSession);
    const session = new StringSession(rawSession);
    const profile = getAppAndDeviceProfileForPhone(phone, apiId, apiHash);
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 3,
      proxy: this.formatProxy(proxy),
      deviceModel: profile.deviceModel,
      systemVersion: profile.systemVersion,
      appVersion: profile.appVersion,
      systemLangCode: profile.systemLangCode,
      langCode: profile.langCode,
    });

    await client.connect();

    this.activeClients.set(phone, client);
    return client;
  }

  /**
   * Scrapes all members from a public/private group or channel
   */
  async scrapeGroupMembers(client: TelegramClient, groupUsernameOrLink: string, limit: number = 2000) {
    this.wsGateway.emitLog('INFO', `Resolving group entity: ${groupUsernameOrLink}...`);
    const entity = await client.getEntity(groupUsernameOrLink);

    this.wsGateway.emitLog('INFO', `Starting member scraping from ${(entity as any).title || groupUsernameOrLink}...`);
    const participants = await client.getParticipants(entity, {
      limit,
    });

    let parsed = participants.map((user: any) => ({
      userId: user.id?.toString(),
      accessHash: user.accessHash?.toString(),
      username: user.username || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      phone: user.phone || null,
      isBot: user.bot || false,
      isScam: user.scam || false,
      status: user.status ? user.status.className : 'unknown',
    }));

    // If participants are hidden (returns <= 2 admins), fallback to chat history messages
    if (parsed.length <= 2) {
      this.wsGateway.emitLog('INFO', `Participant list seems hidden or restricted. Fetching recent message authors...`);
      try {
        const messages = await client.getMessages(entity, { limit: Math.min(limit, 1000) });
        const seenUserIds = new Set<string>(parsed.map((p) => p.userId));

        for (const msg of messages) {
          const sender: any = (msg as any).sender;
          if (sender && sender.id && !seenUserIds.has(sender.id.toString())) {
            seenUserIds.add(sender.id.toString());
            parsed.push({
              userId: sender.id.toString(),
              accessHash: sender.accessHash?.toString(),
              username: sender.username || null,
              firstName: sender.firstName || null,
              lastName: sender.lastName || null,
              phone: sender.phone || null,
              isBot: sender.bot || false,
              isScam: sender.scam || false,
              status: sender.status ? sender.status.className : 'active_sender',
            });
          }
        }
        this.wsGateway.emitLog('INFO', `Discovered ${parsed.length} active members from chat history.`);
      } catch (err: any) {
        this.wsGateway.emitLog('WARN', `Could not fetch message history: ${err.message}`);
      }
    }

    this.wsGateway.emitLog('SUCCESS', `Scraped total of ${parsed.length} members from ${(entity as any).title || groupUsernameOrLink}`);
    return {
      group: {
        title: (entity as any).title || groupUsernameOrLink,
        username: (entity as any).username || null,
        chatId: (entity as any).id?.toString(),
        memberCount: parsed.length,
      },
      members: parsed,
    };
  }

  /**
   * Sends a direct message with policy classification
   */
  async sendDirectMessage(
    client: TelegramClient,
    target: { username?: string | null; userId: string; accessHash?: string | null } | string,
    message: string,
    mediaUrl?: string | null,
  ): Promise<{
    success: boolean;
    isFloodWait?: boolean;
    floodWaitSeconds?: number;
    isSpamBlock?: boolean;
    error?: string;
    result?: any;
  }> {
    try {
      let peer: any;

      if (typeof target === 'string') {
        peer = target;
      } else if (target.username) {
        peer = target.username.startsWith('@') ? target.username : `@${target.username}`;
      } else if (target.accessHash && target.userId) {
        try {
          peer = new Api.InputPeerUser({
            userId: BigInt(target.userId) as any,
            accessHash: BigInt(target.accessHash) as any,
          });
        } catch {
          peer = target.userId;
        }
      } else {
        peer = target.userId;
      }

      let result: any;
      if (mediaUrl && mediaUrl.trim().length > 0) {
        let filePath = mediaUrl.trim();
        if (filePath.startsWith('/uploads/')) {
          const localResolved = path.join(process.cwd(), filePath.replace(/^\//, ''));
          if (fs.existsSync(localResolved)) {
            filePath = localResolved;
          }
        }
        result = await client.sendFile(peer, {
          file: filePath,
          caption: message,
        });
      } else {
        result = await client.sendMessage(peer, {
          message,
        });
      }
      return { success: true, result };
    } catch (err: any) {
      const classification = this.policyEngine.classifyTelegramError(err);
      return {
        success: false,
        isFloodWait: classification.code === 'FLOOD_WAIT',
        floodWaitSeconds: classification.floodSeconds,
        isSpamBlock: classification.code === 'PEER_FLOOD',
        error: classification.message,
      };
    }
  }

  /**
   * Invites or adds a member to a specified target group or channel
   */
  async inviteMemberToGroup(
    client: TelegramClient,
    targetGroupInput: string,
    targetUser: { userId: string; username?: string | null; accessHash?: string | null } | string,
  ): Promise<{
    success: boolean;
    isFloodWait?: boolean;
    floodWaitSeconds?: number;
    isPrivacyRestricted?: boolean;
    isAlreadyParticipant?: boolean;
    isSpamBlock?: boolean;
    error?: string;
  }> {
    try {
      const cleanTarget = targetGroupInput.trim();

      // Handle invite links (e.g. t.me/+hash or t.me/joinchat/hash)
      const inviteHashMatch = cleanTarget.match(/(?:joinchat\/|\+)([a-zA-Z0-9_-]+)/);
      if (inviteHashMatch && inviteHashMatch[1]) {
        const hash = inviteHashMatch[1];
        try {
          const checkRes: any = await client.invoke(new Api.messages.CheckChatInvite({ hash }));
          if (checkRes.className === 'ChatInvite') {
            await client.invoke(new Api.messages.ImportChatInvite({ hash }));
          }
        } catch (joinErr: any) {
          if (!joinErr.message?.includes('USER_ALREADY_PARTICIPANT')) {
            this.logger.warn(`Could not auto-join via invite hash: ${joinErr.message}`);
          }
        }
      }

      const groupEntity = await client.getEntity(cleanTarget);
      let userEntity: any;

      if (typeof targetUser === 'string') {
        userEntity = await client.getEntity(targetUser);
      } else if (targetUser.username) {
        userEntity = await client.getEntity(targetUser.username.startsWith('@') ? targetUser.username : `@${targetUser.username}`);
      } else if (targetUser.userId && targetUser.accessHash) {
        try {
          userEntity = new Api.InputPeerUser({
            userId: BigInt(targetUser.userId) as any,
            accessHash: BigInt(targetUser.accessHash) as any,
          });
        } catch {
          userEntity = await client.getEntity(targetUser.userId);
        }
      } else {
        userEntity = await client.getEntity(targetUser.userId);
      }

      // Check if it is a Megagroup / Supergroup (Channels) or basic Chat
      if ((groupEntity as any).className === 'Channel' || (groupEntity as any).broadcast === false || (groupEntity as any).megagroup) {
        await client.invoke(
          new Api.channels.InviteToChannel({
            channel: groupEntity as any,
            users: [userEntity],
          }),
        );
      } else {
        await client.invoke(
          new Api.messages.AddChatUser({
            chatId: (groupEntity as any).id,
            userId: userEntity,
            fwdLimit: 0,
          }),
        );
      }

      return { success: true };
    } catch (err: any) {
      const classification = this.policyEngine.classifyTelegramError(err);
      const errMsg = err?.message || '';

      if (errMsg.includes('USER_ALREADY_PARTICIPANT')) {
        return { success: false, isAlreadyParticipant: true, error: 'User is already a member of this group.' };
      }

      return {
        success: false,
        isFloodWait: classification.code === 'FLOOD_WAIT',
        floodWaitSeconds: classification.floodSeconds,
        isPrivacyRestricted: classification.code === 'PRIVACY_RESTRICTED',
        isSpamBlock: classification.code === 'PEER_FLOOD',
        error: classification.message,
      };
    }
  }

  /**
   * Task 7.1: Unified MTProto Inbox
   * Attaches real-time incoming message listener to stream inbound direct messages and replies to the user's WebSocket room.
   */
  attachInboxListener(client: TelegramClient, accountId: string, userId: string) {
    if (this.inboxListeners.has(accountId)) {
      return;
    }
    this.inboxListeners.add(accountId);

    try {
      client.addEventHandler(async (event: any) => {
        try {
          const message = event.message;
          if (!message || message.out) return; // Inbound messages only

          let senderId = '';
          let senderUsername = '';
          let senderName = '';

          try {
            const sender = await message.getSender();
            if (sender) {
              senderId = String(sender.id || '');
              senderUsername = sender.username || '';
              senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.title || 'User';
            }
          } catch {}

          if (!senderId && message.senderId) {
            senderId = String(message.senderId);
          }

          let peerId = senderId;
          try {
            if (message.peerId) {
              peerId = String(message.peerId.userId || message.peerId.chatId || message.peerId.channelId || senderId);
            }
          } catch {}

          this.wsGateway.emitToUser(userId, 'inbox:new_message', {
            accountId,
            messageId: message.id,
            peerId,
            senderId,
            senderUsername,
            senderName,
            text: message.message || '',
            date: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
          });
        } catch (eventErr: any) {
          this.logger.debug(`Inbox event error: ${eventErr.message}`);
        }
      }, new NewMessage({}));

      this.logger.log(`Inbox listener attached for account ${accountId}`);
    } catch (attachErr: any) {
      this.logger.warn(`Failed to attach inbox listener for account ${accountId}: ${attachErr.message}`);
    }
  }

  /**
   * Fetches the top recent dialogs/chats for an account with unread count and latest message snippet
   */
  async getAccountDialogs(client: TelegramClient, limit: number = 40) {
    try {
      const dialogs = await client.getDialogs({ limit });
      return dialogs.map((d: any) => {
        const entity = d.entity || {};
        const title =
          d.title ||
          d.name ||
          [entity.firstName, entity.lastName].filter(Boolean).join(' ') ||
          entity.username ||
          `Chat ${d.id}`;

        let peerId = String(d.id);
        if (entity.id) {
          peerId = String(entity.id);
        }

        return {
          id: peerId,
          title,
          username: entity.username || null,
          phone: entity.phone || null,
          unreadCount: d.unreadCount || 0,
          lastMessage: d.message?.message || (d.message?.media ? '[Media]' : ''),
          date: d.message?.date ? new Date(d.message.date * 1000).toISOString() : null,
          isUser: Boolean(d.isUser),
          isGroup: Boolean(d.isGroup),
          isChannel: Boolean(d.isChannel),
        };
      });
    } catch (err: any) {
      this.logger.error(`Failed to get dialogs: ${err.message}`);
      throw new Error(`Failed to load chats: ${err.message}`);
    }
  }

  /**
   * Fetches chat history messages for a specific conversation/peer
   */
  async getDialogMessages(client: TelegramClient, peer: string, limit: number = 50) {
    try {
      let resolvedPeer: any = peer;
      if (/^-?\d+$/.test(peer)) {
        try {
          resolvedPeer = await client.getEntity(BigInt(peer) as any);
        } catch {
          resolvedPeer = peer;
        }
      }

      const messages = await client.getMessages(resolvedPeer, { limit });
      return messages
        .map((m: any) => ({
          id: m.id,
          out: Boolean(m.out),
          text: m.message || (m.media ? '[Media]' : ''),
          date: m.date ? new Date(m.date * 1000).toISOString() : new Date().toISOString(),
          senderId: m.senderId ? String(m.senderId) : null,
        }))
        .reverse();
    } catch (err: any) {
      this.logger.error(`Failed to get messages for peer ${peer}: ${err.message}`);
      return [];
    }
  }

  /**
   * Sends a quick direct reply from a specific account to a peer
   */
  async sendTextMessage(client: TelegramClient, peer: string, message: string) {
    try {
      let resolvedPeer: any = peer;
      if (/^-?\d+$/.test(peer)) {
        try {
          resolvedPeer = await client.getEntity(BigInt(peer) as any);
        } catch {
          resolvedPeer = peer;
        }
      }

      const sent = await client.sendMessage(resolvedPeer, { message });
      return {
        success: true,
        messageId: sent.id,
        date: sent.date ? new Date(sent.date * 1000).toISOString() : new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`Failed to send direct text message: ${err.message}`);
      throw new Error(err.message || 'Failed to send message');
    }
  }
}


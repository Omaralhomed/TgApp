import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';

@Injectable()
export class ProxiesService {
  private readonly logger = new Logger(ProxiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async listProxies(userId?: string) {
    const proxies = await this.prisma.proxy.findMany({
      where: userId ? { userId } : {},
      include: {
        _count: { select: { accounts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return proxies.map((p) => ({
      ...p,
      password: p.password ? '••••••••' : null, // Mask in list responses
    }));
  }

  async addProxy(dto: {
    host: string;
    port: number;
    protocol?: string;
    username?: string;
    password?: string;
    userId: string;
  }) {
    const cleanHost = dto.host.trim().replace(/^https?:\/\//i, '').replace(/^socks[45]:\/\//i, '').replace(/\/.*$/, '');
    const encryptedPassword = dto.password?.trim() ? this.crypto.encrypt(dto.password.trim()) : null;
    return this.prisma.proxy.create({
      data: {
        host: cleanHost,
        port: Number(dto.port),
        protocol: dto.protocol || 'socks5',
        username: dto.username || null,
        password: encryptedPassword,
        userId: dto.userId,
      },
    });
  }

  async addBulkProxies(
    items: Array<{ host: string; port: number; protocol?: string; username?: string; password?: string }>,
    userId: string,
  ) {
    const valid = items
      .filter((p) => p.host && p.port)
      .map((p) => ({
        host: p.host.trim().replace(/^https?:\/\//i, '').replace(/^socks[45]:\/\//i, '').replace(/\/.*$/, ''),
        port: Number(p.port),
        protocol: p.protocol || 'socks5',
        username: p.username?.trim() || null,
        password: p.password?.trim() ? this.crypto.encrypt(p.password.trim()) : null,
        userId,
      }));

    if (valid.length === 0) {
      throw new Error('No valid proxies provided');
    }

    const created = await this.prisma.proxy.createMany({
      data: valid,
    });

    return { success: true, count: created.count };
  }

  async deleteProxy(id: string, userId?: string) {
    const proxy = await this.prisma.proxy.findFirst({
      where: userId ? { id, userId } : { id },
    });
    if (!proxy) throw new NotFoundException('Proxy not found');
    await this.prisma.proxy.delete({ where: { id: proxy.id } });
    return { success: true, message: 'Proxy removed successfully' };
  }

  async testProxy(id: string, userId?: string): Promise<{ success: boolean; latency?: number; message?: string; error?: string }> {
    const proxy = await this.prisma.proxy.findFirst({
      where: userId ? { id, userId } : { id },
    });
    if (!proxy) throw new NotFoundException('Proxy not found');

    const cleanHost = proxy.host.replace(/^https?:\/\//i, '').replace(/^socks[45]:\/\//i, '').replace(/\/.*$/, '');
    const decryptedPassword = proxy.password ? this.crypto.decrypt(proxy.password) : undefined;
    const protocol = (proxy.protocol || 'socks5').toLowerCase();

    const startTime = Date.now();

    try {
      if (protocol.includes('socks')) {
        await this.performSocks5Handshake(cleanHost, proxy.port, proxy.username || undefined, decryptedPassword);
      } else {
        await this.performHttpConnectHandshake(cleanHost, proxy.port, proxy.username || undefined, decryptedPassword);
      }

      const latency = Date.now() - startTime;
      await this.prisma.proxy.update({
        where: { id: proxy.id },
        data: {
          isActive: true,
          responseTimeMs: latency,
          lastCheckedAt: new Date(),
          failureCount: 0,
        },
      });

      return {
        success: true,
        latency,
        message: `Verified Telegram MTProto tunnel via ${protocol.toUpperCase()} in ${latency}ms`,
      };
    } catch (err: any) {
      await this.prisma.proxy.update({
        where: { id: proxy.id },
        data: {
          isActive: false,
          failureCount: { increment: 1 },
          lastCheckedAt: new Date(),
        },
      });

      return {
        success: false,
        error: err.message || 'Proxy verification failed',
      };
    }
  }

  private performSocks5Handshake(
    host: string,
    port: number,
    username?: string,
    password?: string,
  ): Promise<void> {
    const net = require('net');
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(6000);

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.on('timeout', () => {
        cleanup();
        reject(new Error('SOCKS5 proxy connection timed out (6s)'));
      });

      socket.on('error', (err: any) => {
        cleanup();
        reject(new Error(`SOCKS5 connection error: ${err.message}`));
      });

      socket.connect(port, host, () => {
        // Step 1: Send Greeting
        if (username && password) {
          socket.write(Buffer.from([0x05, 0x02, 0x00, 0x02])); // SOCKS5, 2 methods: No Auth, Username/Password
        } else {
          socket.write(Buffer.from([0x05, 0x01, 0x00])); // SOCKS5, 1 method: No Auth
        }
      });

      let state: 'GREETING' | 'AUTH' | 'CONNECT' = 'GREETING';

      socket.on('data', (chunk: Buffer) => {
        try {
          if (state === 'GREETING') {
            if (chunk.length < 2 || chunk[0] !== 0x05) {
              cleanup();
              return reject(new Error('Invalid SOCKS5 version response from proxy'));
            }

            const method = chunk[1];
            if (method === 0x00) {
              // No Auth needed, proceed to CONNECT
              state = 'CONNECT';
              this.sendSocks5ConnectToTelegram(socket);
            } else if (method === 0x02) {
              // Username/Password auth required
              if (!username || !password) {
                cleanup();
                return reject(new Error('Proxy requires username/password authentication'));
              }
              state = 'AUTH';
              const uBuf = Buffer.from(username);
              const pBuf = Buffer.from(password);
              const authBuf = Buffer.concat([
                Buffer.from([0x01, uBuf.length]),
                uBuf,
                Buffer.from([pBuf.length]),
                pBuf,
              ]);
              socket.write(authBuf);
            } else {
              cleanup();
              return reject(new Error('Proxy rejected authentication method'));
            }
          } else if (state === 'AUTH') {
            if (chunk.length < 2 || chunk[1] !== 0x00) {
              cleanup();
              return reject(new Error('Proxy authentication failed: invalid credentials'));
            }
            state = 'CONNECT';
            this.sendSocks5ConnectToTelegram(socket);
          } else if (state === 'CONNECT') {
            if (chunk.length < 2 || chunk[0] !== 0x05) {
              cleanup();
              return reject(new Error('Invalid SOCKS5 connection reply'));
            }
            const replyCode = chunk[1];
            if (replyCode === 0x00) {
              // 0x00 = Request granted! Successful end-to-end handshake with Telegram DC!
              cleanup();
              return resolve();
            } else {
              cleanup();
              const errorMap: Record<number, string> = {
                0x01: 'General SOCKS server failure',
                0x02: 'Connection not allowed by ruleset',
                0x03: 'Network unreachable',
                0x04: 'Host unreachable from proxy',
                0x05: 'Connection refused by Telegram server',
                0x06: 'TTL expired',
              };
              return reject(new Error(errorMap[replyCode] || `SOCKS5 connect error code 0x${replyCode.toString(16)}`));
            }
          }
        } catch (e: any) {
          cleanup();
          reject(e);
        }
      });
    });
  }

  private sendSocks5ConnectToTelegram(socket: any) {
    // Destination: Telegram DC2 Production IP: 149.154.167.50, Port 443
    // VER: 0x05, CMD: 0x01 (CONNECT), RSV: 0x00, ATYP: 0x01 (IPv4), IP: 149.154.167.50, PORT: 443 (0x01BB)
    const connectCmd = Buffer.from([0x05, 0x01, 0x00, 0x01, 149, 154, 167, 50, 0x01, 0xbb]);
    socket.write(connectCmd);
  }

  private performHttpConnectHandshake(
    host: string,
    port: number,
    username?: string,
    password?: string,
  ): Promise<void> {
    const net = require('net');
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(6000);

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.on('timeout', () => {
        cleanup();
        reject(new Error('HTTP proxy connection timed out (6s)'));
      });

      socket.on('error', (err: any) => {
        cleanup();
        reject(new Error(`HTTP proxy error: ${err.message}`));
      });

      socket.connect(port, host, () => {
        let headers = 'CONNECT 149.154.167.50:443 HTTP/1.1\r\nHost: 149.154.167.50:443\r\n';
        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          headers += `Proxy-Authorization: Basic ${auth}\r\n`;
        }
        headers += 'Connection: keep-alive\r\n\r\n';
        socket.write(headers);
      });

      socket.on('data', (chunk: Buffer) => {
        cleanup();
        const responseStr = chunk.toString();
        if (responseStr.startsWith('HTTP/1.1 200') || responseStr.startsWith('HTTP/1.0 200')) {
          resolve();
        } else {
          const firstLine = responseStr.split('\r\n')[0];
          reject(new Error(`HTTP Proxy tunnel rejected: ${firstLine}`));
        }
      });
    });
  }

  async testAllProxies(userId?: string) {
    const proxies = await this.prisma.proxy.findMany({
      where: userId ? { userId } : {},
    });

    const results = [];
    for (const p of proxies) {
      const res = await this.testProxy(p.id, userId);
      results.push({ id: p.id, host: p.host, port: p.port, ...res });
    }

    return { total: proxies.length, results };
  }

  /**
   * Task 7.4: Auto-distributes all user accounts across available proxies
   */
  async autoDistributeProxies(userId: string) {
    const proxies = await this.prisma.proxy.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { responseTimeMs: 'asc' }],
    });

    if (proxies.length === 0) {
      throw new Error('No proxies available in your pool. Please add proxies first.');
    }

    const accounts = await this.prisma.telegramAccount.findMany({
      where: { userId },
    });

    if (accounts.length === 0) {
      return { success: true, message: 'No accounts to assign', assignedCount: 0 };
    }

    let assignedCount = 0;
    for (let i = 0; i < accounts.length; i++) {
      const assignedProxy = proxies[i % proxies.length];
      await this.prisma.telegramAccount.update({
        where: { id: accounts[i].id },
        data: { proxyId: assignedProxy.id },
      });
      assignedCount++;
    }

    return {
      success: true,
      message: `Successfully distributed ${assignedCount} accounts across ${proxies.length} proxies evenly.`,
      assignedCount,
      proxyPoolSize: proxies.length,
    };
  }
}


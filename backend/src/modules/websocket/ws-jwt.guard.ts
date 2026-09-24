import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`WsJwtGuard: Missing token for socket ${client.id}`);
        throw new WsException('Unauthorized: Missing access token');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'tg-saas-super-secret-jwt-key-2026',
      });

      client.data.user = {
        id: payload.sub || payload.id,
        email: payload.email,
        role: payload.role,
        plan: payload.plan,
      };

      return true;
    } catch (err: any) {
      this.logger.warn(`WsJwtGuard failed: ${err.message}`);
      throw new WsException('Unauthorized: Invalid or expired token');
    }
  }

  public extractToken(client: Socket): string | null {
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token.replace(/^Bearer\s+/i, '');
    }
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      return authHeader.replace(/^Bearer\s+/i, '');
    }
    if (client.handshake.query?.token) {
      const qToken = client.handshake.query.token;
      return Array.isArray(qToken) ? qToken[0] : qToken;
    }
    return null;
  }
}

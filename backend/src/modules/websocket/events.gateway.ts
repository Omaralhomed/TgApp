import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface CampaignProgressPayload {
  campaignId?: string;
  sent: number;
  failed: number;
  total: number;
  status: string;
  progress?: number;
}

export interface TaskProgressPayload {
  taskId?: string;
  added: number;
  failed: number;
  total: number;
  status: string;
  progress?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('WebSocket');

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Unauthorized WebSocket connection rejected (missing token): ${client.id}`);
        client.emit('auth_error', { message: 'Authentication required. Missing token.' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'tg-saas-super-secret-jwt-key-2026',
      });

      const userId = payload.sub || payload.id;
      client.data.user = {
        id: userId,
        email: payload.email,
        role: payload.role,
        plan: payload.plan,
      };

      // Automatically join the client to their personal isolated user room
      client.join(`user_${userId}`);

      // If user is Admin or Owner, join them to the admins room for system-wide monitoring
      if (payload.role === 'ADMIN' || payload.role === 'OWNER') {
        client.join('admins');
      }

      this.logger.log(`Authenticated WebSocket connection: ${client.id} (User: ${userId}, Role: ${payload.role})`);
    } catch (err: any) {
      this.logger.warn(`Unauthorized WebSocket connection rejected (${err.message}): ${client.id}`);
      client.emit('auth_error', { message: 'Authentication failed. Invalid or expired token.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.user?.id;
    this.logger.log(`WebSocket disconnected: ${client.id} ${userId ? `(User: ${userId})` : ''}`);
  }

  private extractToken(client: Socket): string | null {
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

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: { userId?: string; campaignId?: string; taskId?: string }) {
    const user = client.data?.user;
    if (!user) {
      client.disconnect(true);
      return;
    }

    // Security check: Only allow users to join their own room, unless they are ADMIN or OWNER
    if (payload?.userId) {
      if (user.role === 'ADMIN' || user.role === 'OWNER' || user.id === payload.userId) {
        client.join(`user_${payload.userId}`);
      } else {
        this.logger.warn(`Security alert: User ${user.id} unauthorized attempt to join room user_${payload.userId}`);
      }
    }

    if (payload?.campaignId) {
      client.join(`campaign_${payload.campaignId}`);
    }

    if (payload?.taskId) {
      client.join(`task_${payload.taskId}`);
    }
  }

  /**
   * Safe log dispatch: routes exclusively to the target user or system admins.
   * Eliminates global broadcast data leak.
   */
  emitLog(type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string, meta?: any) {
    if (this.server) {
      const payload = {
        timestamp: new Date().toISOString(),
        type,
        message,
        meta,
      };

      if (meta?.userId) {
        this.server.to(`user_${meta.userId}`).emit('terminal_log', payload);
      }
      // Always deliver to admins room
      this.server.to('admins').emit('terminal_log', payload);
    }
  }

  /**
   * Directly emit an event to a user's isolated room
   */
  emitToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * User-scoped log dispatch
   */
  emitUserLog(userId: string, type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', message: string, meta?: any) {
    if (this.server) {
      const payload = {
        timestamp: new Date().toISOString(),
        type,
        message,
        meta,
      };
      this.server.to(`user_${userId}`).emit('terminal_log', payload);
      this.server.to('admins').emit('terminal_log', payload);
    }
  }

  /**
   * Campaign execution progress update scoped to campaign room, user room, and admins
   */
  emitCampaignProgress(campaignId: string, progress: CampaignProgressPayload, userId?: string) {
    if (this.server) {
      this.server.to(`campaign_${campaignId}`).emit(`campaign_${campaignId}_progress`, progress);
      if (userId) {
        this.server.to(`user_${userId}`).emit('campaign_global_update', { campaignId, ...progress });
      }
      this.server.to('admins').emit('campaign_global_update', { campaignId, ...progress });
    }
  }

  /**
   * Member adder task execution progress scoped to task room, user room, and admins
   */
  emitTaskProgress(taskId: string, progress: TaskProgressPayload, userId?: string) {
    if (this.server) {
      this.server.to(`task_${taskId}`).emit(`task_${taskId}_progress`, progress);
      if (userId) {
        this.server.to(`user_${userId}`).emit('task_global_update', { taskId, ...progress });
      }
      this.server.to('admins').emit('task_global_update', { taskId, ...progress });
    }
  }

  /**
   * Real-time account status changes scoped to account owner and admins
   */
  emitAccountStatus(accountId: string, data: any, userId?: string) {
    if (this.server) {
      if (userId) {
        this.server.to(`user_${userId}`).emit('account_status_update', { accountId, ...data });
      }
      this.server.to('admins').emit('account_status_update', { accountId, ...data });
    }
  }

  /**
   * System-wide broadcast to all connected sockets
   */
  broadcast(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }

  /**
   * Emit event strictly to the admins room
   */
  emitToAdmins(event: string, data: any) {
    if (this.server) {
      this.server.to('admins').emit(event, data);
    }
  }
}



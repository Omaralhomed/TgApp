import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(data: {
    userId?: string;
    orgId?: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          orgId: data.orgId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          details: data.details ? JSON.stringify(data.details) : null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not write audit log: ${err.message}`);
    }
  }

  async listAuditLogs(userId?: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: userId ? { userId } : {},
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  async listSystemEvents(limit: number = 50) {
    return this.prisma.systemEvent.findMany({
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
    });
  }
}

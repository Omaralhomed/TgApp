import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async listLogs(@CurrentUser() user: any, @Query('limit') limit?: string) {
    return this.auditService.listAuditLogs(user.id, parseInt(limit || '50', 10));
  }

  @Get('system-events')
  async listSystemEvents(@Query('limit') limit?: string) {
    return this.auditService.listSystemEvents(parseInt(limit || '50', 10));
  }
}

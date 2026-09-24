import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverviewMetrics() {
    return this.adminService.getOverviewMetrics();
  }

  @Get('tenants')
  async listTenants(@Query('search') search?: string, @Query('tier') tier?: string) {
    return this.adminService.listTenants(search, tier);
  }

  @Put('tenants/:id/status')
  async toggleTenantStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleTenantStatus(id, isActive);
  }

  @Put('tenants/:id/plan')
  async updateTenantPlan(
    @Param('id') id: string,
    @Body() dto: {
      subscriptionTier?: string;
      quotaMessagesLimit?: number;
      quotaAccountsLimit?: number;
      extendDays?: number;
    },
  ) {
    return this.adminService.updateTenantPlan(id, dto);
  }

  @Post('tenants/:id/impersonate')
  async impersonateUser(@Param('id') id: string, @CurrentUser() adminUser: any) {
    return this.adminService.impersonateUser(id, adminUser);
  }

  @Get('payments')
  async listPaymentReceipts(@Query('status') status?: string) {
    return this.adminService.listPaymentReceipts(status);
  }

  @Post('payments/:id/approve')
  async approvePaymentReceipt(@Param('id') id: string, @CurrentUser() adminUser: any) {
    return this.adminService.approvePaymentReceipt(id, adminUser.id);
  }

  @Post('payments/:id/reject')
  async rejectPaymentReceipt(
    @Param('id') id: string,
    @CurrentUser() adminUser: any,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectPaymentReceipt(id, adminUser.id, reason);
  }

  @Post('circuit-breaker')
  async triggerCircuitBreaker(
    @CurrentUser() adminUser: any,
    @Body('enable') enable: boolean,
  ) {
    return this.adminService.triggerCircuitBreaker(enable, adminUser.id);
  }

  @Get('queues')
  async getQueueStatus() {
    return this.adminService.getQueueStatus();
  }

  @Post('queues/retry-failed')
  async retryFailedJobs() {
    return this.adminService.retryFailedJobs();
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('proxies')
@UseGuards(JwtAuthGuard)
export class ProxiesController {
  constructor(private readonly proxiesService: ProxiesService) {}

  @Get()
  async listProxies(@CurrentUser() user: any) {
    return this.proxiesService.listProxies(user.id);
  }

  @Post()
  async addProxy(
    @Body()
    dto: {
      host: string;
      port: number;
      protocol?: string;
      username?: string;
      password?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.proxiesService.addProxy({ ...dto, userId: user.id });
  }

  @Post('bulk')
  async addBulkProxies(
    @Body()
    dto: {
      proxies: Array<{ host: string; port: number; protocol?: string; username?: string; password?: string }>;
    },
    @CurrentUser() user: any,
  ) {
    return this.proxiesService.addBulkProxies(dto.proxies, user.id);
  }

  @Post('test-all')
  async testAll(@CurrentUser() user: any) {
    return this.proxiesService.testAllProxies(user.id);
  }

  @Post(':id/test')
  async testProxy(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proxiesService.testProxy(id, user.id);
  }

  @Post('auto-distribute')
  async autoDistribute(@CurrentUser() user: any) {
    return this.proxiesService.autoDistributeProxies(user.id);
  }

  @Delete(':id')
  async deleteProxy(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proxiesService.deleteProxy(id, user.id);
  }
}

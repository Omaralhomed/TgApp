import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async listAccounts(@CurrentUser() user: any) {
    return this.accountsService.listAccounts(user.id);
  }

  @Get(':id')
  async getAccountDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsService.getAccountDetails(id, user.id);
  }

  @Post('initiate-auth')
  async initiateAuth(
    @Body() dto: { phone: string; apiId?: number; apiHash?: string; proxyId?: string },
    @CurrentUser() user: any,
  ) {
    return this.accountsService.initiateAuth({ ...dto, userId: user.id });
  }

  @Post('verify-auth')
  async verifyAuth(
    @Body() dto: { phone: string; code: string; password2FA?: string },
    @CurrentUser() user: any,
  ) {
    return this.accountsService.verifyAuth(dto, user.id);
  }

  @Post('sync-all-health')
  async syncAllHealth(@CurrentUser() user: any) {
    return this.accountsService.bulkSyncHealth(user.id);
  }

  @Post(':id/health-check')
  async checkHealth(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsService.checkAccountHealth(id, user.id);
  }

  @Put(':id')
  async updateAccount(
    @Param('id') id: string,
    @Body() data: { dailyLimit?: number; warmupMode?: boolean; proxyId?: string | null },
    @CurrentUser() user: any,
  ) {
    return this.accountsService.updateAccount(id, user.id, data);
  }

  @Delete(':id')
  async deleteAccount(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsService.deleteAccount(id, user.id);
  }

  @Get(':id/dialogs')
  async getDialogs(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsService.getAccountDialogs(id, user.id);
  }

  @Get(':id/dialogs/:peer/messages')
  async getMessages(
    @Param('id') id: string,
    @Param('peer') peer: string,
    @CurrentUser() user: any,
  ) {
    return this.accountsService.getDialogMessages(id, user.id, peer);
  }

  @Post(':id/send-direct')
  async sendDirectReply(
    @Param('id') id: string,
    @Body() body: { peer: string; message: string },
    @CurrentUser() user: any,
  ) {
    return this.accountsService.sendDirectReply(id, user.id, body.peer, body.message);
  }

  @Post(':id/auto-assign-proxy')
  async autoAssignProxy(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountsService.autoAssignProxy(id, user.id);
  }
}


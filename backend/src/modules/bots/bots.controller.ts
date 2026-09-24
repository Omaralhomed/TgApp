import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotEngineService } from './bot-engine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('bots')
export class BotsController {
  constructor(
    private readonly botsService: BotsService,
    private readonly botEngine: BotEngineService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listBots(@CurrentUser() user: any) {
    return this.botsService.listBots(user.id);
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  async connectBot(@CurrentUser() user: any, @Body() dto: { token: string; welcomeMessage?: string; autoReplyRules?: any }) {
    return this.botsService.connectBot(user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getBotDetails(@CurrentUser() user: any, @Param('id') id: string) {
    return this.botsService.getBotDetails(id, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateBot(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { welcomeMessage?: string; autoReplyRules?: any; isActive?: boolean },
  ) {
    return this.botsService.updateBot(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteBot(@CurrentUser() user: any, @Param('id') id: string) {
    return this.botsService.deleteBot(id, user.id);
  }

  @Get(':id/subscribers')
  @UseGuards(JwtAuthGuard)
  async listSubscribers(@CurrentUser() user: any, @Param('id') id: string) {
    return this.botsService.listSubscribers(id, user.id);
  }

  @Post(':id/broadcast')
  @UseGuards(JwtAuthGuard)
  async createBroadcast(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { messageText: string; buttons?: any; mediaUrl?: string },
  ) {
    return this.botsService.createBroadcast(id, user.id, dto);
  }

  @Get(':id/broadcasts')
  @UseGuards(JwtAuthGuard)
  async listBroadcasts(@CurrentUser() user: any, @Param('id') id: string) {
    return this.botsService.listBroadcasts(id, user.id);
  }

  @Get(':id/export-subscribers')
  @UseGuards(JwtAuthGuard)
  async exportSubscribers(@CurrentUser() user: any, @Param('id') id: string) {
    const csvContent = await this.botsService.exportSubscribersCsv(id, user.id);
    return {
      success: true,
      csvContent,
      filename: `bot_${id}_subscribers.csv`,
    };
  }

  /**
   * Public Webhook Receiver for Telegram Bot API updates
   */
  @Post('webhook/:botId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Param('botId') botId: string, @Body() update: any) {
    return this.botEngine.handleIncomingUpdate(botId, update);
  }
}

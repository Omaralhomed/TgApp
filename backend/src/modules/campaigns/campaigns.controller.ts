import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { ChannelClonerService, CloneHistoryDto, StartMirrorDto } from './channel-cloner.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly clonerService: ChannelClonerService,
  ) {}

  @Get()
  async listCampaigns(@CurrentUser() user: any) {
    return this.campaignsService.listCampaigns(user.id);
  }

  @Get(':id')
  async getCampaignDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaignsService.getCampaignDetails(id, user.id);
  }

  @Post()
  async createCampaign(
    @Body()
    dto: {
      name: string;
      messageTemplate: string;
      groupId?: string;
      customTargetUserIds?: string[];
      delayMinSeconds?: number;
      delayMaxSeconds?: number;
      policyConfig?: any;
    },
    @CurrentUser() user: any,
  ) {
    return this.campaignsService.createCampaign({ ...dto, userId: user.id });
  }

  @Post(':id/start')
  async startCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaignsService.startCampaign(id, user.id);
  }

  @Post(':id/pause')
  async pauseCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaignsService.pauseCampaign(id, user.id);
  }

  @Delete(':id')
  async deleteCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaignsService.deleteCampaign(id, user.id);
  }

  @Post('test-spintax')
  async testSpintax(
    @Body() dto: { template: string; mockData?: { firstName?: string; username?: string } },
  ) {
    return this.campaignsService.testSpintax(dto.template, dto.mockData);
  }

  @Post('cloner/history')
  async cloneHistory(@CurrentUser() user: any, @Body() dto: CloneHistoryDto) {
    return this.clonerService.cloneChannelHistory(user.id, dto);
  }

  @Post('cloner/mirror/start')
  async startMirror(@CurrentUser() user: any, @Body() dto: StartMirrorDto) {
    return this.clonerService.startRealtimeMirror(user.id, dto);
  }

  @Post('cloner/mirror/stop/:id')
  async stopMirror(@CurrentUser() user: any, @Param('id') id: string) {
    return this.clonerService.stopRealtimeMirror(user.id, id);
  }

  @Get('cloner/mirror/active')
  async listActiveMirrors(@CurrentUser() user: any) {
    return this.clonerService.listUserMirrors(user.id);
  }
}


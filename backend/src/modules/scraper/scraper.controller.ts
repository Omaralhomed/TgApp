import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('scraper')
@UseGuards(JwtAuthGuard)
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get('groups')
  async listGroups(@CurrentUser() user: any) {
    return this.scraperService.listGroups(user.id);
  }

  @Get('groups/:id/members')
  async getGroupMembers(
    @Param('id') groupId: string,
    @CurrentUser() user: any,
    @Query('activeOnly') activeOnly?: string,
    @Query('hasUsernameOnly') hasUsernameOnly?: string,
    @Query('excludeBots') excludeBots?: string,
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.scraperService.getGroupMembers(
      groupId,
      user.id,
      {
        activeOnly: activeOnly === 'true',
        hasUsernameOnly: hasUsernameOnly === 'true',
        excludeBots: excludeBots === 'true',
        search,
      },
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 50,
    );
  }

  @Post('scrape')
  async scrapeGroup(
    @Body() dto: { accountId: string; groupTarget: string; limit?: number },
    @CurrentUser() user: any,
  ) {
    return this.scraperService.scrapeGroup({ ...dto, userId: user.id });
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string, @CurrentUser() user: any) {
    return this.scraperService.deleteGroup(id, user.id);
  }

  @Delete('members/:id')
  async deleteMember(@Param('id') id: string, @CurrentUser() user: any) {
    return this.scraperService.deleteMember(id, user.id);
  }

  @Post('import-leads')
  async importLeads(
    @Body()
    dto: {
      title: string;
      members: Array<{ username?: string; firstName?: string; lastName?: string; phone?: string }>;
    },
    @CurrentUser() user: any,
  ) {
    return this.scraperService.importCustomLeads({ ...dto, userId: user.id });
  }

  @Get('groups/:id/export-csv')
  async exportMembersCsv(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const csvContent = await this.scraperService.exportMembersCsv(id, user.id);
    return {
      success: true,
      csvContent,
      filename: `group_${id}_members.csv`,
    };
  }
}

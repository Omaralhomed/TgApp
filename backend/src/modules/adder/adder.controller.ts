import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdderService } from './adder.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('adder')
@UseGuards(JwtAuthGuard)
export class AdderController {
  constructor(private readonly adderService: AdderService) {}

  @Get()
  async listTasks(@CurrentUser() user: any) {
    return this.adderService.listTasks(user.id);
  }

  @Get(':id')
  async getTaskDetails(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adderService.getTaskDetails(id, user.id);
  }

  @Post()
  async createTask(
    @Body()
    dto: {
      name: string;
      sourceGroupId?: string;
      targetGroup: string;
      delayMinSeconds?: number;
      delayMaxSeconds?: number;
    },
    @CurrentUser() user: any,
  ) {
    return this.adderService.createTask({ ...dto, userId: user.id });
  }

  @Post(':id/start')
  async startTask(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adderService.startTask(id, user.id);
  }

  @Post(':id/pause')
  async pauseTask(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adderService.pauseTask(id, user.id);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adderService.deleteTask(id, user.id);
  }
}

import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService, SpintaxGenerationRequest, QuickBotActionDto } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-spintax')
  async generateSpintax(@Body() dto: SpintaxGenerationRequest) {
    return this.aiService.generateSpintaxCopy(dto);
  }

  @Post('execute-action')
  async executeBotAction(@CurrentUser() user: any, @Body() dto: QuickBotActionDto) {
    return this.aiService.executeBotAction(user.id, dto);
  }
}

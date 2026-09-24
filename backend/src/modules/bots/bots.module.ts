import { Module } from '@nestjs/common';
import { BotsService } from './bots.service';
import { BotsController } from './bots.controller';
import { BotEngineService } from './bot-engine.service';

@Module({
  controllers: [BotsController],
  providers: [BotsService, BotEngineService],
  exports: [BotsService, BotEngineService],
})
export class BotsModule {}

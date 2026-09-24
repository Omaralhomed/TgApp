import { Module } from '@nestjs/common';
import { TelegramEngineService } from './telegram-engine.service';
import { TelegramPolicyEngine } from './telegram-policy.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebSocketModule],
  providers: [TelegramEngineService, TelegramPolicyEngine],
  exports: [TelegramEngineService, TelegramPolicyEngine],
})
export class TelegramModule {}

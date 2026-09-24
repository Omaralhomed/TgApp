import { Module } from '@nestjs/common';
import { AdderService } from './adder.service';
import { AdderController } from './adder.controller';
import { DatabaseModule } from '../../database/database.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [DatabaseModule, TelegramModule, WebSocketModule, QueueModule],
  controllers: [AdderController],
  providers: [AdderService],
  exports: [AdderService],
})
export class AdderModule {}

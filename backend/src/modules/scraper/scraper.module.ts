import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { DatabaseModule } from '../../database/database.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [DatabaseModule, TelegramModule, WebSocketModule, QueueModule],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}

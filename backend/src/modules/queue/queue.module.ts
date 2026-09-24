import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { CampaignProcessor } from './processors/campaign.processor';
import { AdderProcessor } from './processors/adder.processor';
import { ScraperProcessor } from './processors/scraper.processor';
import { HealthProcessor } from './processors/health.processor';
import { DatabaseModule } from '../../database/database.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DatabaseModule, TelegramModule, WebSocketModule],
  providers: [
    QueueService,
    CampaignProcessor,
    AdderProcessor,
    ScraperProcessor,
    HealthProcessor,
  ],
  exports: [
    QueueService,
    CampaignProcessor,
    AdderProcessor,
    ScraperProcessor,
    HealthProcessor,
  ],
})
export class QueueModule {}

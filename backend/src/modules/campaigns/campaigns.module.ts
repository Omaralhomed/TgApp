import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { DatabaseModule } from '../../database/database.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { QueueModule } from '../queue/queue.module';

import { ChannelClonerService } from './channel-cloner.service';

@Module({
  imports: [DatabaseModule, TelegramModule, WebSocketModule, QueueModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, ChannelClonerService],
  exports: [CampaignsService, ChannelClonerService],
})
export class CampaignsModule {}

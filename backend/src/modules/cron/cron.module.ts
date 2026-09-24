import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenanceCronService } from './maintenance-cron.service';
import { DatabaseModule } from '../../database/database.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, WebSocketModule],
  providers: [MaintenanceCronService],
  exports: [MaintenanceCronService],
})
export class CronModule {}

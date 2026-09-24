import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { QueueModule } from './modules/queue/queue.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ProxiesModule } from './modules/proxies/proxies.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { AdderModule } from './modules/adder/adder.module';
import { AuditModule } from './modules/audit/audit.module';
import { AiModule } from './modules/ai/ai.module';
import { BotsModule } from './modules/bots/bots.module';
import { AdminModule } from './modules/admin/admin.module';
import { BillingModule } from './modules/billing/billing.module';
import { StorageModule } from './modules/storage/storage.module';
import { CronModule } from './modules/cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    DatabaseModule,
    QueueModule,
    WebSocketModule,
    TelegramModule,
    AccountsModule,
    ScraperModule,
    CampaignsModule,
    AdderModule,
    ProxiesModule,
    AuthModule,
    HealthModule,
    AuditModule,
    AiModule,
    BotsModule,
    AdminModule,
    BillingModule,
    StorageModule,
    CronModule,
  ],
})
export class AppModule {}

import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { WsJwtGuard } from './ws-jwt.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'tg-saas-super-secret-jwt-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [EventsGateway, WsJwtGuard],
  exports: [EventsGateway, WsJwtGuard],
})
export class WebSocketModule {}

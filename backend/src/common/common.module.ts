import { Module, Global } from '@nestjs/common';
import { CryptoService } from './crypto/crypto.service';
import { SanitizeInterceptor } from './interceptors/sanitize.interceptor';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  providers: [CryptoService, SanitizeInterceptor, RolesGuard],
  exports: [CryptoService, SanitizeInterceptor, RolesGuard],
})
export class CommonModule {}

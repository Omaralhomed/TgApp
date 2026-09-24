import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import { CryptoService } from './common/crypto/crypto.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Ensure uploads directory exists
  const receiptsPath = join(process.cwd(), 'uploads', 'receipts');
  const mediaPath = join(process.cwd(), 'uploads', 'media');
  if (!existsSync(receiptsPath)) mkdirSync(receiptsPath, { recursive: true });
  if (!existsSync(mediaPath)) mkdirSync(mediaPath, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static assets for uploaded receipts and media
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global exception filter for centralized error handling and secret masking
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global sanitize interceptor to strip sensitive tokens/hashes
  const cryptoService = app.get(CryptoService);
  app.useGlobalInterceptors(new SanitizeInterceptor(cryptoService));

  // Strict validation pipe with automatic payload transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 Telegram SaaS Enterprise Backend running on: http://localhost:${port}`);
}
bootstrap();

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger('PrismaService');

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected to database successfully.');
      
      // Ensure default system user exists for initial setup and standalone usage
      try {
        await this.user.upsert({
          where: { email: 'admin@tgcloud.io' },
          update: {},
          create: {
            id: 'default-user',
            email: 'admin@tgcloud.io',
            name: 'Administrator',
            passwordHash: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.qH0vJ2mQeFsmfU.b9QvNq2a3/bT/c12',
            role: 'ADMIN',
            plan: 'ENTERPRISE',
          },
        });
        this.logger.log('Default system user verified.');
      } catch (err: any) {
        this.logger.warn(`Could not seed default user: ${err.message}`);
      }
    } catch (err: any) {
      this.logger.error(`Database connection failed: ${err.message}. Ensure database is running and DATABASE_URL is valid.`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (err: any) {
      this.logger.warn(`Prisma disconnect warning: ${err.message}`);
    }
  }
}

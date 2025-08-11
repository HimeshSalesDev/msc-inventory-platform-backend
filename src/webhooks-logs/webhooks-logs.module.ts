import { Module } from '@nestjs/common';
import { WebhooksLogsService } from './webhooks-logs.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { WebhookLog } from 'src/entities/webhook_logs.entity';
import { WebhookLogsController } from './webhooks-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookLog]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [WebhookLogsController],
  providers: [WebhooksLogsService, JwtAuthGuard, RolesGuard],
  exports: [WebhooksLogsService],
})
export class WebhooksLogsModule {}

import { Module } from '@nestjs/common';
import { InventoryReferenceService } from './inventory_reference.service';
import { InventoryReferenceController } from './inventory_reference.controller';
import { WebhooksLogsModule } from 'src/webhooks-logs/webhooks-logs.module';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [WebhooksLogsModule, JwtConfigModule, ConfigModule],
  controllers: [InventoryReferenceController],
  providers: [InventoryReferenceService],
})
export class InventoryReferenceModule {}

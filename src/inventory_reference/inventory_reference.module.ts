import { Module } from '@nestjs/common';
import { InventoryReferenceService } from './inventory_reference.service';
import { InventoryReferenceController } from './inventory_reference.controller';
import { WebhooksLogsModule } from 'src/webhooks-logs/webhooks-logs.module';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryReference } from 'src/entities/inventory_reference.entity';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryReference]),
    WebhooksLogsModule,
    JwtConfigModule,
    ConfigModule,
    AuditLogModule,
    UsersModule,
  ],
  controllers: [InventoryReferenceController],
  providers: [InventoryReferenceService],
})
export class InventoryReferenceModule {}

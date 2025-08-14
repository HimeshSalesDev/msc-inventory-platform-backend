import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogController } from './audit-log.controller';
import { AuditLog } from 'src/entities/auditLog.entity';

import { AuditLogService } from './audit-log.service';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UsersModule } from 'src/users/users.module';
import { AuditEventService } from './audit-event.service';
import { AuditListener } from 'src/audit-log/listeners/audit.listener';

import { Inventory } from 'src/entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, Inventory]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditEventService,
    AuditListener,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuditLogService, AuditEventService],
})
export class AuditLogModule {}

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

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService, JwtAuthGuard, RolesGuard],
  exports: [AuditLogService],
})
export class AuditLogModule {}

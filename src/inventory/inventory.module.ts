import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from 'src/entities/inventory.entity';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/entities/role.entity';
import { UsersModule } from 'src/users/users.module';
import { AuditLogModule } from 'src/audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, Role]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
    AuditLogModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, JwtAuthGuard, RolesGuard],
  exports: [InventoryService],
})
export class InventoryModule {}

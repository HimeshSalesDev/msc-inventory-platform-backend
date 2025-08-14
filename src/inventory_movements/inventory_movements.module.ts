import { Module } from '@nestjs/common';
import { InventoryMovementsService } from './inventory_movements.service';
import { InventoryMovementsController } from './inventory_movements.controller';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { UsersModule } from 'src/users/users.module';
import { InventoryMovement } from 'src/entities/inventory_movements.entity';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryMovement]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
    AuditLogModule,
  ],
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService],
  exports: [InventoryMovementsService],
})
export class InventoryMovementsModule {}

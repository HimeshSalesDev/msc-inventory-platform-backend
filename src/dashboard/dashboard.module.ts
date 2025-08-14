import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { Inbound } from 'src/entities/inbound.entity';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryMovement } from 'src/entities/inventory_movements.entity';
import { InventoryMovementsModule } from 'src/inventory_movements/inventory_movements.module';
import { Inventory } from 'src/entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inbound, InventoryMovement, Inventory]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
    InventoryMovementsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

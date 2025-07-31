import { Module } from '@nestjs/common';
import { InventoryLocationService } from './inventory_location.service';
import { InventoryLocationController } from './inventory_location.controller';
import { InventoryLocation } from 'src/entities/inventory_location.entity';
import { Inventory } from 'src/entities/inventory.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/entities/role.entity';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryLocation, Inventory, Role]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [InventoryLocationController],
  providers: [InventoryLocationService],
})
export class InventoryLocationModule {}

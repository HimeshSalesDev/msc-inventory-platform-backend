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
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { InventoryReference } from 'src/entities/inventory_reference.entity';
import { Inbound } from 'src/entities/inbound.entity';
import { InboundPreOrder } from 'src/entities/inbound-preorder.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryLocation,
      InventoryReference,
      Inventory,
      Role,
      Inbound,
      InboundPreOrder,
    ]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
    AuditLogModule,
  ],
  controllers: [InventoryLocationController],
  providers: [InventoryLocationService],
})
export class InventoryLocationModule {}

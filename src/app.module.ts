import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { AppDataSource } from '../data-source';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { InventoryModule } from './inventory/inventory.module';
import { InboundModule } from './inbound/inbound.module';
import { InventoryLocationModule } from './inventory_location/inventory_location.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { InventoryReferenceModule } from './inventory_reference/inventory_reference.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(AppDataSource.options),
    PassportModule.register({ session: false }),
    UsersModule,
    AuthModule,
    InventoryModule,
    InventoryLocationModule,
    InboundModule,
    AuditLogModule,
    InventoryReferenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

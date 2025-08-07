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
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryMovementsModule } from './inventory_movements/inventory_movements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      // Set this to `true` to use wildcards
      wildcard: true,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 20,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    PassportModule.register({ session: false }),
    UsersModule,
    AuthModule,
    InventoryModule,
    InventoryLocationModule,
    InboundModule,
    AuditLogModule,
    InventoryReferenceModule,
    InventoryMovementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

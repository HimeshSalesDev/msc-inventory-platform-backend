import { Module } from '@nestjs/common';
import { ProductionBatchesService } from './production-batches.service';
import { ProductionBatchesController } from './production-batches.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/entities/role.entity';
import { PreOrder } from 'src/entities/pre_orders.entity';
import { ProductionBatch } from 'src/entities/production_batches.entity';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { Inbound } from 'src/entities/inbound.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, PreOrder, ProductionBatch, Inbound]),
    JwtConfigModule,
    UsersModule,
    ConfigModule,
  ],
  controllers: [ProductionBatchesController],
  providers: [ProductionBatchesService],
  exports: [ProductionBatchesService],
})
export class ProductionBatchesModule {}

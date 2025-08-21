import { Module } from '@nestjs/common';
import { PreOrdersService } from './pre-orders.service';
import { PreOrdersController } from './pre-orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/entities/role.entity';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { ProductionBatch } from 'src/entities/production_batches.entity';
import { PreOrder } from 'src/entities/pre_orders.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, PreOrder, ProductionBatch]),
    JwtConfigModule,
    UsersModule,
    ConfigModule,
  ],
  controllers: [PreOrdersController],
  providers: [PreOrdersService],
  exports: [PreOrdersService],
})
export class PreOrdersModule {}

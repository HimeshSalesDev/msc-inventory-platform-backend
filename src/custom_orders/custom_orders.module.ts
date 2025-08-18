import { Module } from '@nestjs/common';
import { CustomOrdersService } from './custom_orders.service';
import { CustomOrdersController } from './custom_orders.controller';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CustomOrders } from 'src/entities/custom_orders.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomOrders]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [CustomOrdersController],
  providers: [CustomOrdersService, JwtAuthGuard, RolesGuard],
  exports: [CustomOrdersService],
})
export class CustomOrdersModule {}

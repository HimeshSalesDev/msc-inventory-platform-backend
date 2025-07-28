import { Module } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Inbound } from 'src/entities/inbound.entity';
import { Role } from 'src/entities/role.entity';
import { JwtConfigModule } from 'src/auth/jwt.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inbound, Role]),
    JwtConfigModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [InboundController],
  providers: [InboundService, JwtAuthGuard, RolesGuard],
  exports: [InboundService],
})
export class InboundModule {}

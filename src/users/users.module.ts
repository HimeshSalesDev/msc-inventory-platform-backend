import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { JwtConfigModule } from '../auth/jwt.module'; // Import shared JWT module
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditEventService } from 'src/audit-log/audit-event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    JwtConfigModule,
    ConfigModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard, AuditEventService],
  exports: [UsersService],
})
export class UsersModule {}

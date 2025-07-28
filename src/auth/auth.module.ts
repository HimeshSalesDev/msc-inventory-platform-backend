import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtConfigModule } from './jwt.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: true }),
    JwtConfigModule,
    TypeOrmModule.forFeature([User, Role]),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
